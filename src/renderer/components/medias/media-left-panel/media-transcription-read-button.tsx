import {
  AppSettingsProviderContext,
  MediaShadowProviderContext,
} from "@renderer/context";
import {
  forwardRef,
  useContext,
  useEffect,
  useState,
  Children,
  cloneElement,
  isValidElement,
  useRef,
} from "react";
import type { ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ScrollArea,
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  toast,
} from "@renderer/components/ui";
import { TimelineEntry } from "echogarden/dist/utilities/Timeline.d.js";
import { t } from "i18next";
import {
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  GaugeCircleIcon,
  LoaderIcon,
  MicIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { useRecordings } from "@renderer/hooks";
import { formatDateTime } from "@renderer/lib/utils";
import {
  LoaderSpin,
  MediaCaption,
  RecordingDetail,
  WavesurferPlayer,
} from "@renderer/components";
import { LiveAudioVisualizer } from "react-audio-visualize";

export const MediaTranscriptionReadButton = forwardRef<
  HTMLButtonElement,
  {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const [open, setOpen] = useState(false);
  const { media, transcription, setRecordingType, playMode, setPlayMode } =
    useContext(MediaShadowProviderContext);
  const originalPlayMode = useRef(playMode);

  useEffect(() => {
    if (open) {
      setRecordingType("transcription");
      originalPlayMode.current = playMode;
      setPlayMode("all");
    } else {
      setRecordingType("segment");
      setPlayMode(originalPlayMode.current);
    }
  }, [open]);

  const trigger = props.children ? (
    Children.only(props.children)
  ) : (
    <Button ref={ref} variant="outline" size="sm" className="hidden lg:block">
      {t("readThrough")}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isValidElement(trigger) ? cloneElement(trigger, { ref }) : trigger}
      </DialogTrigger>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-w-full h-5/6 flex flex-col p-0"
      >
        <DialogTitle className="hidden">{t("readThrough")}</DialogTitle>
        <ScrollArea className="flex-1 px-6 pt-4">
          <div className="select-text mx-auto w-[86%] p-10 theme-green">
            <h3 className="font-bold text-xl my-4">{media.name}</h3>
            {open &&
              transcription.result.timeline.map(
                (sentence: TimelineEntry, index: number) => (
                  <div key={index} className="flex flex-start space-x-2">
                    <span className="text-sm text-muted-foreground min-w-max leading-8">
                      #{index + 1}
                    </span>
                    <MediaCaption
                      caption={sentence}
                      currentSegmentIndex={index}
                      displayIpa={false}
                      displayNotes={true}
                    />
                  </div>
                )
              )}
          </div>
          <div className="mt-12">
            {open && <TranscriptionRecordingsList />}
          </div>
        </ScrollArea>
        <div className="h-16 border-t">
          {open && <ReadThroughControls />}
        </div>
      </DialogContent>
    </Dialog>
  );
});

const TranscriptionRecordingsList = () => {
  const [deleting, setDeleting] = useState<RecordingType>(null);
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const { media } = useContext(MediaShadowProviderContext);
  const [assessing, setAssessing] = useState<RecordingType>();

  const handleDelete = () => {
    if (!deleting) return;

    EnjoyApp.recordings.destroy(deleting.id);
  };

  const handleDownload = (recording: RecordingType) => {
    EnjoyApp.dialog
      .showSaveDialog({
        title: t("download"),
        defaultPath: recording.filename,
        filters: [
          {
            name: "Audio",
            extensions: [recording.filename.split(".").pop()],
          },
        ],
      })
      .then((savePath) => {
        if (!savePath) return;

        toast.promise(
          EnjoyApp.download.start(recording.src, savePath as string),
          {
            loading: t("downloadingFile", { file: recording.filename }),
            success: () => t("downloadedSuccessfully"),
            error: t("downloadFailed"),
            position: "bottom-right",
          }
        );
      })
      .catch((err) => {
        if (err) toast.error(err.message);
      });
  };

  const { recordings, loading: loadingRecordings } = useRecordings(media, -1);

  if (loadingRecordings) {
    return <LoaderSpin />;
  }

  return (
    <div>
      {recordings.map((recording) => (
        <div
          key={recording.id}
          className="mx-auto w-full max-w-prose px-4 mb-4"
          id={recording.id}
        >
          <div className="flex items-center justify-end space-x-2 mb-2">
            <span className="text-sm text-muted-foreground">
              {formatDateTime(recording.createdAt)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <MoreHorizontalIcon className="w-4 h-4" />
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleDownload(recording)}
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  <span>{t("download")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setAssessing(recording)}
                >
                  <GaugeCircleIcon
                    className={`w-4 h-4 mr-2
                    ${
                      recording.pronunciationAssessment
                        ? recording.pronunciationAssessment
                            .pronunciationScore >= 80
                          ? "text-green-500"
                          : recording.pronunciationAssessment
                              .pronunciationScore >= 60
                          ? "text-yellow-600"
                          : "text-red-500"
                        : ""
                    }
                    `}
                  />
                  <span>{t("pronunciationAssessment")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => setDeleting(recording)}
                >
                  <Trash2Icon className="w-4 h-4 mr-2" />
                  <span>{t("delete")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <WavesurferPlayer id={recording.id} src={recording.src} />
        </div>
      ))}

      <Sheet
        open={Boolean(assessing)}
        onOpenChange={(open) => {
          if (!open) setAssessing(undefined);
        }}
      >
        <SheetContent
          aria-describedby={undefined}
          side="bottom"
          className="rounded-t-2xl shadow-lg max-h-content overflow-y-scroll"
          displayClose={false}
        >
          <SheetHeader className="flex items-center justify-center -mt-4 mb-2">
            <SheetClose>
              <ChevronDownIcon />
            </SheetClose>
          </SheetHeader>

          {assessing && <RecordingDetail recording={assessing} />}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(value) => {
          if (value) return;
          setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteRecording")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteRecordingConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={handleDelete}>{t("delete")}</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const PLAYBACK_RATE_OPTIONS = [0.8, 0.9, 1.0];

const ReadThroughPlayer = () => {
  const { wavesurfer } = useContext(MediaShadowProviderContext);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const handlePlayPause = async () => {
    if (!wavesurfer) return;
    wavesurfer.playPause();
  };

  const handleSetPlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (wavesurfer) {
      wavesurfer.setPlaybackRate(rate);
    }
  };

  useEffect(() => {
    if (!wavesurfer) return;

    wavesurfer.setPlaybackRate(playbackRate);
  }, [wavesurfer]);

  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="flex items-center space-x-1">
        {PLAYBACK_RATE_OPTIONS.map((rate) => (
          <Button
            key={rate}
            variant={playbackRate === rate ? "default" : "ghost"}
            size="lg"
            className="h-7 px-4 text-base"
            onClick={() => handleSetPlaybackRate(rate)}
          >
            {rate}x
          </Button>
        ))}
      </div>

      <Button
        variant="default"
        onClick={handlePlayPause}
        className="aspect-square p-0 h-10 rounded-full"
      >
        {wavesurfer?.isPlaying() ? (
          <PauseIcon fill="white" className="w-6 h-6" />
        ) : (
          <PlayIcon fill="white" className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
};

const ReadThroughControls = () => {
  return (
    <div className="h-16 flex items-center justify-center px-6">
      <ReadThroughPlayer />
    </div>
  );
};
