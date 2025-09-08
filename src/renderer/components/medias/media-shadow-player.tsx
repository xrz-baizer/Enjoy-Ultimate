import { MediaShadowProviderContext } from "@renderer/context";
import {
  MediaLoadingModal,
  MediaRightPanel,
  MediaLeftPanel,
  MediaBottomPanel,
} from "@renderer/components";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@renderer/components/ui";
import { useContext, useState, useEffect } from "react";

export const MediaShadowPlayer = () => {
  const { theme } = useContext(MediaShadowProviderContext);

  useEffect(() => {
    const className = theme === "green" ? "theme-green" : "";
    if (className) {
      document.documentElement.classList.add(className);
    }

    return () => {
      if (className) {
        document.documentElement.classList.remove(className);
      }
    };
  }, [theme]);

  return (
    <div className="h-full">
      <ResizablePanelGroup
        autoSaveId="media-shadow-player-layout"
        direction="vertical"
      >
        <ResizablePanel defaultSize={60} minSize={50}>
          <TopPanel />
        </ResizablePanel>
        <ResizableHandle />

        <ResizablePanel minSize={20}>
          <MediaBottomPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
      <MediaLoadingModal />
    </div>
  );
};

const TopPanel = () => {
  const { layout } = useContext(MediaShadowProviderContext);
  const [displayPanel, setDisplayPanel] = useState<"left" | "right" | null>(
    "right"
  );

  if (layout === "normal") {
    return (
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          id="left-panel"
          order={0}
          defaultSize={26}
          minSize={20}
          className="bg-[var(--background-alt)]"
        >
          <MediaLeftPanel />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="right-panel" order={1} minSize={20}>
          <MediaRightPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return (
    <div className="h-full">
      <MediaLeftPanel
        className={displayPanel === "left" ? "flex-1" : "invisible fixed"}
        setDisplayPanel={setDisplayPanel}
      />
      <MediaRightPanel
        className={displayPanel === "right" ? "flex-1" : "invisible fixed"}
        setDisplayPanel={setDisplayPanel}
      />
    </div>
  );
};
