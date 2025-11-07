import { useState, useContext, Fragment } from "react";
import {
  AppSettingsProviderContext,
  MediaShadowProviderContext,
} from "@renderer/context";
import { convertWordIpaToNormal } from "@/utils";
import { TimelineEntry } from "echogarden/dist/utilities/Timeline.d.js";
import { t } from "i18next";

export const MediaCaption = (props: {
  caption: TimelineEntry;
  language?: string;
  selectedIndices?: number[];
  currentSegmentIndex: number;
  activeIndex?: number;
  displayIpa?: boolean;
  displayNotes?: boolean;
  notes?: NoteType[];
  onClick?: (index: number) => void;
}) => {
  const { currentNotes } = useContext(MediaShadowProviderContext);
  const { learningLanguage, ipaMappings } = useContext(
    AppSettingsProviderContext
  );
  const allNotes = (props.notes || currentNotes);
  // Separate notes into word-level and sentence-level
  const wordLevelNotes = allNotes.filter((note) => note.parameters?.quoteIndices && note.parameters.quoteIndices.length > 0);
  const sentenceLevelNotes = allNotes.filter((note) => !note.parameters?.quoteIndices || note.parameters.quoteIndices.length === 0);

  const {
    caption,
    selectedIndices = [],
    currentSegmentIndex,
    activeIndex,
    displayIpa,
    displayNotes,
    onClick,
  } = props;
  const language = props.language || learningLanguage;

  const [notedquoteIndices, setNotedquoteIndices] = useState<number[]>([]);

  const ipas = caption.timeline.map((w) =>
    w.timeline?.map((t) =>
      t.timeline && language.startsWith("en")
        ? convertWordIpaToNormal(
            t.timeline.map((s) => s.text),
            { mappings: ipaMappings }
          ).join("")
        : t.text
    )
  );

  // Build words array from timeline, preserving punctuation from original text
  // This approach sequentially matches words in the text to handle duplicates correctly
  const words: string[] = [];
  let searchStartPos = 0;

  for (const timelineWord of caption.timeline) {
    const word = timelineWord.text;
    // Find the word in the remaining text (case-insensitive)
    const searchText = caption.text.slice(searchStartPos);
    const wordIndex = searchText.toLowerCase().indexOf(word.toLowerCase());

    if (wordIndex !== -1) {
      const actualStartPos = searchStartPos + wordIndex;
      const actualEndPos = actualStartPos + word.length;

      // Extract the actual word from original text (preserves original case)
      let wordWithPunct = caption.text.slice(actualStartPos, actualEndPos);

      // Check for punctuation immediately after the word
      // Include hyphens, en-dashes, and em-dashes that connect words
      const afterText = caption.text.slice(actualEndPos);
      const punctMatch = afterText.match(/^([.,!?:;'""\u2019\u2018\-\u2013\u2014]+)/);

      let nextSearchPos = actualEndPos;
      if (punctMatch) {
        wordWithPunct += punctMatch[1];
        // Move search position past the punctuation
        nextSearchPos = actualEndPos + punctMatch[1].length;
      }

      words.push(wordWithPunct);
      searchStartPos = nextSearchPos;
    } else {
      // Fallback: use the word as-is if not found
      words.push(word);
    }
  }

  return (
    <div className="flex flex-wrap px-4 pb-4 bg-muted/50">
      {/* use the words splitted by caption text if it is matched with the timeline length, otherwise use the timeline */}
      {words.map((word, index) => (
        <Fragment key={`word-${currentSegmentIndex}-${index}`}>
          <div
            className=""
            id={`word-${currentSegmentIndex}-${index}`}
          >
            <div
              className={`font-serif px-1 ${
                onClick && "hover:bg-red-500/10 cursor-pointer"
              } ${index === activeIndex ? "text-red-500" : ""} ${
                selectedIndices.includes(index) ? "bg-red-500/10 selected" : ""
              } ${
                notedquoteIndices.includes(index)
                  ? "border-b border-red-500 border-dashed"
                  : ""
              }`}
              style={{
                fontSize: `calc(1.125rem * var(--caption-text-size, 1))`
              }}
              onClick={() => onClick && onClick(index)}
            >
              {word}
            </div>

            {displayIpa && (
              <div
                className={`select-text text-muted-foreground font-code px-1 ${
                  index === 0 ? "before:content-['/']" : ""
                } ${
                  index === caption.timeline.length - 1
                    ? "after:content-['/']"
                    : ""
                }`}
                style={{
                  fontSize: `calc(0.875rem * var(--caption-text-size, 1))`
                }}
              >
                {ipas[index]}
              </div>
            )}

            {displayNotes &&
              wordLevelNotes
                .filter((note) => note.parameters.quoteIndices[0] === index)
                .map((note) => (
                  <div
                    key={`note-${currentSegmentIndex}-${note.id}`}
                    className="mb-1 text-red-500 max-w-64 line-clamp-3 font-code cursor-pointer"
                    style={{
                      fontSize: `calc(0.75rem * var(--caption-text-size, 1))`,
                      textAlign: "right",
                    }}
                    onMouseOver={() =>
                      setNotedquoteIndices(note.parameters.quoteIndices)
                    }
                    onMouseLeave={() => setNotedquoteIndices([])}
                    onClick={() =>
                      document.getElementById("note-" + note.id)?.scrollIntoView()
                    }
                  >
                    {note.parameters.quoteIndices[0] === index && note.content}
                  </div>
                ))}
          </div>
          {word.endsWith(",") && (
            <div className="basis-full h-0" />
          )}
        </Fragment>
      ))}

      {/* Display sentence-level notes at the end */}
      {displayNotes && sentenceLevelNotes.length > 0 && (
        <div className="w-full mt-2 px-1">
          {sentenceLevelNotes.map((note) => (
            <div
              key={`sentence-note-${currentSegmentIndex}-${note.id}`}
              className="mb-2 p-2 text-green-700 bg-green-500/10 rounded border-l-2 border-green-500 font-code cursor-pointer"
              style={{
                fontSize: `calc(0.75rem * var(--caption-text-size, 1))`
              }}
              onClick={() =>
                document.getElementById("note-" + note.id)?.scrollIntoView()
              }
            >
              <div className="line-clamp-3">{note.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
