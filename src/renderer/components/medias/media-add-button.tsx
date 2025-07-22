import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Button,
  Progress,
  toast,
  Switch,
  Label,
  Textarea,
} from "@renderer/components/ui";
import { PlusCircleIcon, LoaderIcon } from "lucide-react";
import { t } from "i18next";
import { useState, useContext, useEffect } from "react";
import { AudioFormats, VideoFormats } from "@/constants";
import {
  AppSettingsProviderContext,
  DbProviderContext,
} from "@renderer/context";
import { useNavigate } from "react-router-dom";

export const MediaAddButton = (props: { type?: "Audio" | "Video" }) => {
  const { type = "Audio" } = props;
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const { addDblistener, removeDbListener } = useContext(DbProviderContext);
  const [uri, setUri] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const navigate = useNavigate();

  const handleOpen = (value: boolean) => {
    if (submitting) {
      setOpen(true);
    } else {
      setOpen(value);
    }
  };

  const handleSubmit = async () => {
    if (!uri) return;
    if (files.length > 50) {
      toast.error(t("resourcesAddInBatchLimitError", { limit: 50 }));
      return;
    }

    setSubmitting(true);

    if (files.length > 1) {
      Promise.allSettled(
        files.map((f) =>
          EnjoyApp[`${type.toLowerCase()}s` as "audios" | "videos"].create(f, {
            name,
            description,
            compressing,
          })
        )
      )
        .then((results) => {
          const fulfilled = results.filter((r) => r.status === "fulfilled");
          const rejected = results.filter((r) => r.status === "rejected");

          if (fulfilled.length === 0) {
            toast.error(
              t("resourcesAdded", {
                fulfilled: fulfilled.length,
                rejected: rejected.length,
              })
            );
          } else if (rejected.length > 0) {
            toast.warning(
              t("resourcesAdded", {
                fulfilled: fulfilled.length,
                rejected: rejected.length,
                reasons: rejected.map((r: any) => r.reason?.message).join("; "),
              })
            );
          } else {
            toast.success(
              t("resourcesAdded", {
                fulfilled: fulfilled.length,
                rejected: rejected.length,
              })
            );
          }
        })
        .catch((err) => {
          toast.error(err.message);
        })
        .finally(() => {
          setSubmitting(false);
          setOpen(false);
        });
    } else {
      EnjoyApp[`${type.toLowerCase()}s` as "audios" | "videos"]
        .create(uri, { name, description, compressing })
        .then((media) => {
          toast.success(t("resourceAdded"));
          navigate(`/${type.toLowerCase()}s/${media.id}`);
        })
        .catch((err) => {
          toast.error(err.message);
        })
        .finally(() => {
          setSubmitting(false);
          setOpen(false);
        });
    }
  };

  const onMediaCreate = (event: CustomEvent) => {
    const { record, action, model } = event.detail || {};
    if (!record) return;
    if (action !== "create") return;
    if (model !== type) return;

    setCreatedCount((count) => count + 1);
  };

  useEffect(() => {
    if (submitting) {
      addDblistener(onMediaCreate);
    }

    return () => {
      removeDbListener(onMediaCreate);
    };
  }, [submitting]);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="capitalize">
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          {t("addResource")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addResource")}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-1 items-center gap-4 mb-4">
            <div className="col-span-1 flex space-x-2">
              <Input
                placeholder="Source Url"
                value={uri}
                disabled={submitting}
                onChange={(element) => {
                  setUri(element.target.value);
                  setFiles([]);
                }}
              />
              <Button
                variant="secondary"
                className="capitalize min-w-max"
                disabled={submitting}
                onClick={async () => {
                  const selected = await EnjoyApp.dialog.showOpenDialog({
                    properties: ["openFile", "multiSelections"],
                    filters: [
                      {
                        name: "audio,video",
                        extensions:
                          type === "Audio" ? AudioFormats : VideoFormats,
                      },
                    ],
                  });
                  if (selected) {
                    setFiles(selected);
                    setUri(selected[0]);
                  }
                }}
              >
                {t("localFile")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-2 mb-4">
            {/*<Label htmlFor="name" className="text-left">*/}
            {/*  {t("name")}*/}
            {/*</Label>*/}
            <Input
              id="name"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-1"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 items-center gap-4">
            {/*<Label htmlFor="description" className="text-right">*/}
            {/*  {t("desc")}*/}
            {/*</Label>*/}
            <Textarea
              id="description"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-1"
              disabled={submitting}
            />
          </div>

          {/* 解压功能 */}
          {/*<div className="flex items-center space-x-2 mt-4">*/}
          {/*  <Switch*/}
          {/*    checked={compressing}*/}
          {/*    onCheckedChange={(value) => setCompressing(value)}*/}
          {/*  />*/}
          {/*  <span className="text-sm text-muted-foreground">*/}
          {/*    {compressing*/}
          {/*      ? t("compressMediaBeforeAdding")*/}
          {/*      : t("keepOriginalMedia")}*/}
          {/*  </span>*/}
          {/*</div>*/}

          {files.length > 0 && (
            <div className="text-sm mt-4">
              {t("selectedFiles")}: {files.length}
            </div>
          )}

          {files.length > 0 && submitting && (
            <div className="flex items-center gap-2 mt-4">
              <Progress
                value={(createdCount * 100.0) / files.length}
                max={100}
              />
              <span>
                {createdCount}/{files.length}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            disabled={submitting}
            onClick={() => {
              setOpen(false);
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="default"
            disabled={(!uri && files.length === 0) || submitting}
            onClick={handleSubmit}
          >
            {submitting && <LoaderIcon className="animate-spin w-4 mr-2" />}
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
