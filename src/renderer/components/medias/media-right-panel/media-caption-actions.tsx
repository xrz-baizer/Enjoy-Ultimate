import { useEffect, useState, useContext, useRef } from "react";
import {
  AppSettingsProviderContext,
  MediaShadowProviderContext,
} from "@renderer/context";
import cloneDeep from "lodash/cloneDeep";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
} from "@renderer/components/ui";
import { ConversationShortcuts, MediaCaption } from "@renderer/components";
import { t } from "i18next";
import {
  BotIcon,
  CopyIcon,
  CheckIcon,
  SpeechIcon,
  NotebookPenIcon,
  DownloadIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import {
  Timeline,
  TimelineEntry,
} from "echogarden/dist/utilities/Timeline.d.js";
import { convertWordIpaToNormal } from "@/utils";
import { useCopyToClipboard } from "@uidotdev/usehooks";

export const MediaCaptionActions = (props: {
  caption: TimelineEntry;
  displayIpa: boolean;
  setDisplayIpa: (display: boolean) => void;
  displayNotes: boolean;
  setDisplayNotes: (display: boolean) => void;
}) => {
  const { caption, displayIpa, setDisplayIpa, displayNotes, setDisplayNotes } =
    props;
  const { media, currentSegment, createSegment, transcription, activeRegion } =
    useContext(MediaShadowProviderContext);
  const { EnjoyApp, learningLanguage, ipaMappings } = useContext(
    AppSettingsProviderContext
  );
  const [_, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState<boolean>(false);

  // 默认展开设置功能
  const [fbtOpen, setFbtOpen] = useState<boolean>(true);
  // 添加文字大小调节功能
  const [textSize, setTextSize] = useState<number>(1.16); // 2 = 默认大小

  const handleDownload = async () => {
    if (activeRegion && !activeRegion.id.startsWith("segment-region")) {
      handleDownloadActiveRegion();
    } else {
      handleDownloadSegment();
    }
  };

  const handleDownloadSegment = async () => {
    const segment = currentSegment || (await createSegment());
    if (!segment) return;

    EnjoyApp.dialog
      .showSaveDialog({
        title: t("download"),
        defaultPath: `${media.name}(${segment.startTime.toFixed(
          2
        )}s-${segment.endTime.toFixed(2)}s).mp3`,
        filters: [
          {
            name: "Audio",
            extensions: ["mp3"],
          },
        ],
      })
      .then((savePath) => {
        if (!savePath) return;

        toast.promise(
          EnjoyApp.download.start(segment.src, savePath as string),
          {
            loading: t("downloadingFile", { file: media.filename }),
            success: () => t("downloadedSuccessfully"),
            error: t("downloadFailed"),
            position: "bottom-right",
          }
        );
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.message);
      });
  };

  const handleDownloadActiveRegion = async () => {
    if (!activeRegion) return;
    let src: string;

    try {
      if (media.mediaType === "Audio") {
        src = await EnjoyApp.audios.crop(media.id, {
          startTime: activeRegion.start,
          endTime: activeRegion.end,
        });
      } else if (media.mediaType === "Video") {
        src = await EnjoyApp.videos.crop(media.id, {
          startTime: activeRegion.start,
          endTime: activeRegion.end,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(`${t("downloadFailed")}: ${err.message}`);
    }

    if (!src) return;

    EnjoyApp.dialog
      .showSaveDialog({
        title: t("download"),
        defaultPath: `${media.name}(${activeRegion.start.toFixed(
          2
        )}s-${activeRegion.end.toFixed(2)}s).mp3`,
        filters: [
          {
            name: "Audio",
            extensions: ["mp3"],
          },
        ],
      })
      .then((savePath) => {
        if (!savePath) return;

        toast.promise(EnjoyApp.download.start(src, savePath as string), {
          loading: t("downloadingFile", { file: media.filename }),
          success: () => t("downloadedSuccessfully"),
          error: t("downloadFailed"),
          position: "bottom-right",
        });
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  if (!transcription) return null;
  if (!caption) return null;
  // 将文字大小应用到全局样式
  useEffect(() => {
    const rootElement = document.documentElement;
    rootElement.style.setProperty('--caption-text-size', `${textSize}`);
  }, [textSize]);

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={displayIpa ? "secondary" : "outline"}
        size="icon"
        className="rounded-full w-8 h-8 p-0"
        data-tooltip-id="media-shadow-tooltip"
        data-tooltip-content={t("displayIpa")}
        data-tooltip-place="top"
        onClick={() => setDisplayIpa(!displayIpa)}
      >
        <SpeechIcon className="w-4 h-4" />
      </Button>

      <Button
        variant={displayNotes ? "secondary" : "outline"}
        size="icon"
        className="rounded-full w-8 h-8 p-0"
        data-tooltip-id="media-shadow-tooltip"
        data-tooltip-content={t("displayNotes")}
        data-tooltip-place="top"
        onClick={() => setDisplayNotes(!displayNotes)}
      >
        <NotebookPenIcon className="w-4 h-4" />
      </Button>
      
      {/* 文字大小减小按钮 */}
      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-8 h-8 p-0"
        data-tooltip-id="media-shadow-tooltip"
        data-tooltip-content={t("decreaseTextSize")}
        data-tooltip-place="top"
        onClick={() => setTextSize(Math.max(0.8, textSize - 0.1))}
        disabled={textSize <= 0.8}
      >
        <span className="text-xs font-bold">A-</span>
      </Button>
      
      {/* 文字大小增加按钮 */}
      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-8 h-8 p-0"
        data-tooltip-id="media-shadow-tooltip"
        data-tooltip-content={t("increaseTextSize")}
        data-tooltip-place="top"
        onClick={() => setTextSize(Math.min(1.5, textSize + 0.1))}
        disabled={textSize >= 1.5}
      >
        <span className="text-xs font-bold">A+</span>
      </Button>

      {/*<ConversationShortcuts*/}
      {/*  prompt={caption.text as string}*/}
      {/*  trigger={*/}
      {/*    <Button*/}
      {/*      data-tooltip-id="media-shadow-tooltip"*/}
      {/*      data-tooltip-content={t("sendToAIAssistant")}*/}
      {/*      data-tooltip-place="top"*/}
      {/*      variant="outline"*/}
      {/*      size="sm"*/}
      {/*      className="p-0 w-8 h-8 rounded-full"*/}
      {/*    >*/}
      {/*      <BotIcon className="w-5 h-5" />*/}
      {/*    </Button>*/}
      {/*  }*/}
      {/*/>*/}

      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-8 h-8 p-0"
        data-tooltip-id="media-shadow-tooltip"
        data-tooltip-content={t("copyText")}
        data-tooltip-place="top"
        onClick={() => {
          if (displayIpa) {
            const text = caption.timeline
              .map((word) => {
                const ipas = word.timeline.map((t) =>
                  t.timeline.map((s) => s.text).join("")
                );
                return `${word.text}(${
                  (transcription.language || learningLanguage).startsWith(
                    "en"
                  )
                    ? convertWordIpaToNormal(ipas, {
                        mappings: ipaMappings,
                      }).join("")
                    : ipas.join("")
                })`;
              })
              .join(" ");

            copyToClipboard(text);
          } else {
            copyToClipboard(caption.text);
          }
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
          }, 1500);
        }}
      >
        {copied ? (
          <CheckIcon className="w-4 h-4 text-green-500" />
        ) : (
          <CopyIcon
            data-tooltip-id="media-shadow-tooltip"
            data-tooltip-content={t("copyText")}
            data-tooltip-place="top"
            className="w-4 h-4"
          />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-8 h-8 p-0"
        data-tooltip-id="media-shadow-tooltip"
        data-tooltip-content={t("downloadSegment")}
        data-tooltip-place="top"
        onClick={handleDownload}
      >
        <DownloadIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};
