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
  Progress,
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
  ChevronDownIcon,
  DownloadIcon,
  GaugeCircleIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  Repeat1Icon,
  ListOrderedIcon,
  StickyNoteIcon,
  Trash2Icon,
  TimerIcon,
} from "lucide-react";
import { useRecordings } from "@renderer/hooks";
import { formatDateTime, formatDuration } from "@renderer/lib/utils";
import {
  LoaderSpin,
  MediaCaption,
  RecordingDetail,
  WavesurferPlayer,
} from "@renderer/components";
import { useHotkeys } from "react-hotkeys-hook";

export const MediaTranscriptionReadButton = forwardRef<
  HTMLButtonElement,
  {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const [open, setOpen] = useState(false);
  const [notesVisible, setNotesVisible] = useState(true);
  const [allNotes, setAllNotes] = useState<Record<number, NoteType[]>>({});
  const {
    media,
    transcription,
    setRecordingType,
    playMode,
    setPlayMode,
    wavesurfer,
  } = useContext(MediaShadowProviderContext);
  const originalPlayMode = useRef(playMode);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const sentenceRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRecordingType("transcription");
      originalPlayMode.current = playMode;
      setPlayMode("all");
      // Load all segments and their notes
      if (media && transcription?.result?.timeline) {
        const loadAllNotes = async () => {
          const notesMap: Record<number, NoteType[]> = {};

          // Load segments for each sentence index
          for (let i = 0; i < transcription.result.timeline.length; i++) {
            try {
              // Try to find segment for this index
              const segments = await EnjoyApp.segments.findAll({
                targetId: media.id,
                targetType: media.mediaType,
                segmentIndex: i,
              });

              // If segment exists, load its notes
              if (segments && segments.length > 0) {
                const segment = segments[0];
                const notes = await EnjoyApp.notes.findAll({
                  targetId: segment.id,
                  targetType: "Segment",
                });
                if (notes && notes.length > 0) {
                  // Include all notes - both word-level and sentence-level notes
                  notesMap[i] = notes;
                }
              }
            } catch (error) {
              // Segment doesn't exist for this index, skip
            }
          }

          setAllNotes(notesMap);
        };

        loadAllNotes();
      }
    } else {
      setRecordingType("segment");
      setPlayMode(originalPlayMode.current);
      setAllNotes({});
    }
  }, [open, media, transcription]);

  useEffect(() => {
    if (!wavesurfer) return;
    if (!transcription?.result?.timeline) return;

    const subscriptions = [
      wavesurfer.on("timeupdate", (currentTime) => {
        let sentenceIndex = -1;
        let wordIndex = -1;

        for (let i = 0; i < transcription.result.timeline.length; i++) {
          const sentence = transcription.result.timeline[i] as TimelineEntry;
          if (currentTime >= sentence.startTime && currentTime < sentence.endTime) {
            sentenceIndex = i;
            for (let j = 0; j < sentence.timeline.length; j++) {
              const word = sentence.timeline[j];
              if (currentTime >= word.startTime && currentTime < word.endTime) {
                wordIndex = j;
                break;
              }
            }
            break;
          }
        }

        setActiveSentenceIndex(sentenceIndex);
        setActiveWordIndex(wordIndex);
      }),
    ];

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  }, [wavesurfer, open, transcription?.result]);

  // Auto-scroll effect: center the current sentence during playback
  useEffect(() => {
    if (!open || activeSentenceIndex < 0) return;

    const currentSentence = sentenceRefs.current[activeSentenceIndex];
    if (!currentSentence) return;

    // Use requestAnimationFrame to ensure smooth scrolling even with dynamic content (notes)
    requestAnimationFrame(() => {
      currentSentence.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [activeSentenceIndex, open]);

  // 如果 media 或 transcription 不存在，不渲染按钮
  if (!media || !transcription?.result?.timeline) {
    return null;
  }

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
        {isValidElement(trigger) ? cloneElement(trigger as any, { ref }) : trigger}
      </DialogTrigger>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-w-full h-5/6 flex flex-col p-0"
      >
        <DialogTitle className="hidden">{t("readThrough")}</DialogTitle>
        <ScrollArea className="flex-1 px-6 pt-4" ref={scrollContainerRef}>
          <div className="select-text mx-auto w-[93%] p-10 theme-green">
            <h3 className="font-bold text-xl my-4">{media.name}</h3>
            {open &&
                transcription.result.timeline.map(
                    (sentence: TimelineEntry, index: number) => (
                  <div
                    key={index}
                    className="flex flex-start space-x-2"
                    ref={(el) => {
                      sentenceRefs.current[index] = el;
                    }}
                  >
                    <span
                      className="text-sm text-muted-foreground min-w-max leading-8 cursor-pointer px-2 py-1 -ml-2 rounded-l-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!wavesurfer) return;
                        const duration = wavesurfer.getDuration();
                        if (!duration) return;
                        const percentage = sentence.startTime / duration;
                        wavesurfer.seekTo(percentage);
                        // Auto play when clicking sentence
                        if (!wavesurfer.isPlaying()) {
                          wavesurfer.play();
                        }
                      }}
                    >
                      #{index + 1}
                    </span>
                    <div
                      className="flex-1 cursor-pointer rounded-r-md"
                      onClick={(e) => {
                        // Check if click is on a word or note element
                        const target = e.target as HTMLElement;
                        if (target.closest('.cursor-pointer') && target.closest('.cursor-pointer') !== e.currentTarget) {
                          return; // Let the child element handle it
                        }

                        e.stopPropagation();
                        if (!wavesurfer) return;
                        const duration = wavesurfer.getDuration();
                        if (!duration) return;
                        const percentage = sentence.startTime / duration;
                        wavesurfer.seekTo(percentage);
                        // Auto play when clicking sentence
                        if (!wavesurfer.isPlaying()) {
                          wavesurfer.play();
                        }
                      }}
                    >
                      <MediaCaption
                        caption={sentence}
                        currentSegmentIndex={index}
                        activeIndex={
                          activeSentenceIndex === index ? activeWordIndex : -1
                        }
                        displayIpa={false}
                        displayNotes={notesVisible}
                        notes={allNotes[index] || []}
                      />
                    </div>
                  </div>
                )
              )}
          </div>
          <div className="mt-12">
            {open && <TranscriptionRecordingsList />}
          </div>
        </ScrollArea>
        <div className="h-24 border-t">
          {open && (
            <ReadThroughControls
              notesVisible={notesVisible}
              setNotesVisible={setNotesVisible}
              scrollContainerRef={scrollContainerRef}
            />
          )}
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

const PLAYBACK_RATE_OPTIONS = [0.7, 0.8, 0.9, 1.0];
const LOOP_INTERVAL_OPTIONS = [0, 1, 2, 3];

type PlayMode = "all" | "single" | "single-loop";

const ReadThroughPlayer = ({
  notesVisible,
  setNotesVisible,
  scrollContainerRef,
}: {
  notesVisible: boolean;
  setNotesVisible: (visible: boolean) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}) => {
  const { wavesurfer, transcription, clickToPlay } = useContext(MediaShadowProviderContext);
  const [playbackRate, setPlaybackRate] = useState(0.8);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playMode, setPlayMode] = useState<PlayMode>("all");
  const [loopInterval, setLoopInterval] = useState(1); // seconds
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const currentSentenceRef = useRef<number>(-1);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlayPause = async () => {
    if (!wavesurfer) return;
    wavesurfer.playPause();
  };

  const handlePrevSentence = () => {
    if (!wavesurfer || !transcription?.result?.timeline) return;
    const prevIndex = Math.max(0, currentSentenceRef.current - 1);
    const prevSentence = transcription.result.timeline[prevIndex];
    if (prevSentence) {
      // Save current playing state
      const wasPlaying = wavesurfer.isPlaying();

      // Pause first to prevent conflicts
      if (wasPlaying) {
        wavesurfer.pause();
      }

      // Seek to the new position
      const percentage = prevSentence.startTime / wavesurfer.getDuration();
      wavesurfer.seekTo(percentage);

      // Resume playing if it was playing before, or if clickToPlay is enabled
      if (wasPlaying || clickToPlay) {
        setTimeout(() => {
          wavesurfer.play();
        }, 50);
      }
    }
  };

  const handleNextSentence = () => {
    if (!wavesurfer || !transcription?.result?.timeline) return;
    const nextIndex = Math.min(
      transcription.result.timeline.length - 1,
      currentSentenceRef.current + 1
    );
    const nextSentence = transcription.result.timeline[nextIndex];
    if (nextSentence) {
      // Save current playing state
      const wasPlaying = wavesurfer.isPlaying();

      // Pause first to prevent conflicts
      if (wasPlaying) {
        wavesurfer.pause();
      }

      // Seek to the new position
      const percentage = nextSentence.startTime / wavesurfer.getDuration();
      wavesurfer.seekTo(percentage);

      // Resume playing if it was playing before, or if clickToPlay is enabled
      if (wasPlaying || clickToPlay) {
        setTimeout(() => {
          wavesurfer.play();
        }, 50);
      }
    }
  };

  // Keyboard controls
  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      handlePlayPause();
    },
    {
      enableOnFormTags: false,
    },
    [wavesurfer]
  );

  useHotkeys(
    "left",
    (e) => {
      e.preventDefault();
      handlePrevSentence();
    },
    {
      enableOnFormTags: false,
    },
    [wavesurfer, transcription]
  );

  useHotkeys(
    "right",
    (e) => {
      e.preventDefault();
      handleNextSentence();
    },
    {
      enableOnFormTags: false,
    },
    [wavesurfer, transcription]
  );

  const handleSetPlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (wavesurfer) {
      wavesurfer.setPlaybackRate(rate);
    }
  };

  const seekToPosition = (clientX: number) => {
    if (!progressRef.current || !wavesurfer || !duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    wavesurfer.seekTo(percentage);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    seekToPosition(e.clientX);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    seekToPosition(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      seekToPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, duration, wavesurfer]);

  useEffect(() => {
    if (!wavesurfer) return;
    if (!transcription?.result?.timeline) return;

    wavesurfer.setPlaybackRate(playbackRate);

    const subscriptions = [
      wavesurfer.on("play", () => {
        setPlaying(true);
      }),
      wavesurfer.on("pause", () => {
        setPlaying(false);
      }),
      wavesurfer.on("ready", (duration) => {
        setDuration(duration);
      }),
      wavesurfer.on("timeupdate", (time) => {
        setCurrentTime(time);

        // Find current sentence
        let sentenceIndex = -1;
        for (let i = 0; i < transcription.result.timeline.length; i++) {
          const sentence = transcription.result.timeline[i] as TimelineEntry;
          if (time >= sentence.startTime && time < sentence.endTime) {
            sentenceIndex = i;
            break;
          }
        }

        setCurrentSentenceIndex(sentenceIndex);
        currentSentenceRef.current = sentenceIndex;

        // Handle single sentence playback
        if (playMode === "single" && sentenceIndex !== -1) {
          const sentence = transcription.result.timeline[sentenceIndex] as TimelineEntry;
          // Check if we've reached the end of the current sentence
          if (time >= sentence.endTime - 0.05) { // 0.05s tolerance
            wavesurfer.pause();
          }
        } else if (playMode === "single-loop" && sentenceIndex !== -1) {
          const sentence = transcription.result.timeline[sentenceIndex] as TimelineEntry;
          // Loop back to the start of current sentence with interval
          if (time >= sentence.endTime - 0.05) { // 0.05s tolerance
            // Clear any existing timeout
            if (loopTimeoutRef.current) {
              clearTimeout(loopTimeoutRef.current);
            }

            // Pause at the end of sentence
            wavesurfer.pause();

            // Wait for the interval, then loop back
            if (loopInterval > 0) {
              loopTimeoutRef.current = setTimeout(() => {
                const percentage = sentence.startTime / wavesurfer.getDuration();
                wavesurfer.seekTo(percentage);
                wavesurfer.play();
              }, loopInterval * 1000);
            } else {
              // No interval, loop immediately
              const percentage = sentence.startTime / wavesurfer.getDuration();
              wavesurfer.seekTo(percentage);
              wavesurfer.play();
            }
          }
        }
      }),
      wavesurfer.on("finish", () => {
        // Only loop for "all" mode when reaching the end
        if (playMode === "all") {
          // Scroll to top
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }
          // Restart playback from beginning
          wavesurfer.seekTo(0);
          wavesurfer.play();
        }
      }),
    ];

    setPlaying(wavesurfer.isPlaying());
    setDuration(wavesurfer.getDuration());
    setCurrentTime(wavesurfer.getCurrentTime());

    return () => {
      subscriptions.forEach((unsub) => unsub());
      // Clear any pending loop timeout
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
    };
  }, [wavesurfer, playMode, loopInterval, scrollContainerRef, transcription]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono">
          {formatDuration(currentTime)}
        </span>
        <span className="text-sm font-mono">{formatDuration(duration)}</span>
      </div>
      <div
        ref={progressRef}
        className="cursor-pointer"
        onClick={handleProgressClick}
        onMouseDown={handleMouseDown}
      >
        <Progress
          value={(currentTime / duration) * 100}
          className="h-2 bg-gray-200"
          indicatorClassName="bg-[#40c593]"
        />
      </div>
      <div className="flex items-center justify-center space-x-2 mt-2">
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
          {playing ? (
            <PauseIcon fill="white" className="w-6 h-6" />
          ) : (
            <PlayIcon fill="white" className="w-6 h-6" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={playMode !== "all" ? "default" : "ghost"}
              size="sm"
              className="gap-1"
            >
              {playMode === "all" && (
                <>
                  <ListOrderedIcon className="w-4 h-4" />
                  <span className="text-xs">{t("playAll")}</span>
                </>
              )}
              {playMode === "single" && (
                <>
                  <Repeat1Icon className="w-4 h-4" />
                  <span className="text-xs">{t("playSingle")}</span>
                </>
              )}
              {playMode === "single-loop" && (
                <>
                  <RepeatIcon className="w-4 h-4" />
                  <span className="text-xs">{t("loopSingle")}</span>
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => setPlayMode("all")}
              className="cursor-pointer"
            >
              <ListOrderedIcon className="w-4 h-4 mr-2" />
              <span>{t("playAll")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setPlayMode("single")}
              className="cursor-pointer"
            >
              <Repeat1Icon className="w-4 h-4 mr-2" />
              <span>{t("playSingle")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setPlayMode("single-loop")}
              className="cursor-pointer"
            >
              <RepeatIcon className="w-4 h-4 mr-2" />
              <span>{t("loopSingle")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {playMode === "single-loop" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <TimerIcon className="w-4 h-4" />
                <span className="text-xs">{loopInterval}s</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {LOOP_INTERVAL_OPTIONS.map((interval) => (
                <DropdownMenuItem
                  key={interval}
                  onClick={() => setLoopInterval(interval)}
                  className="cursor-pointer"
                >
                  <TimerIcon className="w-4 h-4 mr-2" />
                  <span>{interval === 0 ? t("noInterval") : `${interval}s`}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant={notesVisible ? "default" : "ghost"}
          size="sm"
          onClick={() => setNotesVisible(!notesVisible)}
          className="gap-1"
        >
          <StickyNoteIcon className="w-4 h-4" />
          <span className="text-xs">{notesVisible ? t("hideNotes") : t("showNotes")}</span>
        </Button>
      </div>
    </div>
  );
};

const ReadThroughControls = ({
  notesVisible,
  setNotesVisible,
  scrollContainerRef,
}: {
  notesVisible: boolean;
  setNotesVisible: (visible: boolean) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}) => {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <ReadThroughPlayer
        notesVisible={notesVisible}
        setNotesVisible={setNotesVisible}
        scrollContainerRef={scrollContainerRef}
      />
    </div>
  );
};