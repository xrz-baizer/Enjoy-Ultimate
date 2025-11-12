import { useContext, useEffect, useRef, useState } from "react";
import {
  MediaShadowProviderContext,
  ThemeProviderContext,
} from "@renderer/context";
import {
  MediaPlayer as VidstackMediaPlayer,
  MediaProvider as VidstackMediaProvider,
  isAudioProvider,
  isVideoProvider,
  useMediaRemote,
  TextTrack,
  MediaPlayerInstance,
} from "@vidstack/react";
import {
  DefaultAudioLayout,
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import { TimelineEntry } from "echogarden/dist/utilities/Timeline.d.js";
import { milisecondsToTimestamp } from "@/utils";
import { toast } from "@renderer/components/ui";
import { cn } from "@renderer/lib/utils";

export const MediaProvider = (props: { className?: string }) => {
  const { className } = props;
  const { theme } = useContext(ThemeProviderContext);
  const { media, setMediaProvider, setDecodeError, transcription } = useContext(
    MediaShadowProviderContext
  );
  const mediaRemote = useMediaRemote();
  const player = useRef<MediaPlayerInstance>(null);
  const retryCountRef = useRef<number>(0);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  useEffect(() => {
    if (!transcription?.result?.timeline) return;
    if (!player?.current) return;

    const srt = transcription.result.timeline
      .map(
        (t: TimelineEntry) =>
          `1\n${milisecondsToTimestamp(
            t.startTime * 1000
          )} --> ${milisecondsToTimestamp(t.endTime * 1000)}\n${t.text}`
      )
      .join("\n\n");

    player.current.textTracks.clear();
    player.current.textTracks.add(
      new TextTrack({
        label: "Transcription",
        content: srt,
        kind: "subtitles",
        type: "srt",
        language: transcription.result.language,
      })
    );
  }, [player, transcription]);

  // Reset retry count when media source changes
  useEffect(() => {
    retryCountRef.current = 0;
    console.debug(`[MediaProvider] Reset retry count for new media: ${media?.src}`);

    // Check if using M4A without compressed version (suboptimal format)
    if (media?.src) {
      const isM4A = media.src.endsWith(".m4a");
      const isCompressed = media.src.includes(".compressed.mp3");

      if (isM4A && !isCompressed) {
        console.warn(
          `[MediaProvider] WARNING: Using uncompressed M4A format for ${media.src}. ` +
          `This may cause intermittent PIPELINE_ERROR_DECODE errors. ` +
          `Consider re-importing with compression enabled.`
        );
      } else if (isCompressed) {
        console.debug(`[MediaProvider] Using compressed MP3 format (optimal)`);
      }
    }
  }, [media?.src]);

  // Cleanup on component unmount (when key changes)
  useEffect(() => {
    console.debug(`[MediaProvider] Component mounted with src: ${media?.src}`);

    return () => {
      console.debug(`[MediaProvider] Cleanup triggered - component unmounting`);

      // Immediately clear media provider reference to stop WaveSurfer initialization
      setMediaProvider(null);

      // Safe cleanup: pause player without calling destroy()
      if (player.current) {
        try {
          console.debug(`[MediaProvider] Pausing player`);
          player.current.pause();
        } catch (error) {
          console.warn(`[MediaProvider] Error during player pause:`, error);
        }
      }

      console.debug(`[MediaProvider] Cleanup completed`);
    };
  }, []); // Empty deps: only run on mount/unmount since component remounts when media changes

  if (!media?.src) return null;

  console.debug(`[MediaProvider] Rendering player for src: ${media.src}`);

  return (
    <div className={cn("px-2 py-4", className)}>
      <VidstackMediaPlayer
        key={`${media.src}-${retryTrigger}`}
        ref={player}
        className="my-auto"
        src={media.src}
        onCanPlayThrough={(detail, nativeEvent) => {
          console.debug(`[MediaProvider] onCanPlayThrough - media ready for src: ${media?.src}`);
          mediaRemote.setTarget(nativeEvent.target);
          const { provider } = detail;
          if (isAudioProvider(provider)) {
            console.debug(`[MediaProvider] Setting audio provider`);
            setMediaProvider(provider.audio);
          } else if (isVideoProvider(provider)) {
            console.debug(`[MediaProvider] Setting video provider`);
            setMediaProvider(provider.video);
          }
        }}
        onError={(err) => {
          console.error(`[MediaProvider] Vidstack error:`, err);
          console.error(`[MediaProvider] Media src: ${media?.src}`);

          // Auto-retry for PIPELINE_ERROR_DECODE (truncated packet issue)
          const isPipelineError = err.message?.includes("PIPELINE_ERROR_DECODE");
          const maxRetries = 1;

          if (isPipelineError && retryCountRef.current < maxRetries) {
            retryCountRef.current += 1;
            console.warn(
              `[MediaProvider] Auto-retrying (${retryCountRef.current}/${maxRetries}) for PIPELINE_ERROR_DECODE`
            );

            // Trigger re-render to retry loading
            setRetryTrigger(prev => prev + 1);
            return;
          }

          // Show error after retries exhausted or for other errors
          const errorMsg = err.message || "Error loading media";
          if (isPipelineError && retryCountRef.current >= maxRetries) {
            console.error(`[MediaProvider] Retry failed after ${maxRetries} attempts`);
          }

          toast.error(errorMsg);
          setDecodeError(errorMsg);
        }}
      >
        <VidstackMediaProvider />
        <DefaultAudioLayout icons={defaultLayoutIcons} colorScheme={theme} />
        <DefaultVideoLayout icons={defaultLayoutIcons} colorScheme={theme} />
      </VidstackMediaPlayer>
    </div>
  );
};
