
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  toast,
} from "@renderer/components/ui";
import { PlusCircleIcon, LoaderIcon } from "lucide-react";
import { t } from "i18next";
import { useState, useContext, useEffect } from "react";
import { AudioFormats, VideoFormats } from "@/constants";
import {
  AppSettingsProviderContext,
} from "@renderer/context";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui";

export const MediaBatchAddButton = (props: {
  type?: "Audio" | "Video";
  categories?: CategoryType[];
}) => {
  const { type = "Audio", categories = [] } = props;
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const [categoryId, setCategoryId] = useState<string>("");
  const [files, setFiles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = (value: boolean) => {
    if (submitting) {
      setOpen(true);
    } else {
      setOpen(value);
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    if (!categoryId) {
      toast.error(t("selectCategory"));
      return;
    }

    setSubmitting(true);

    const results = await Promise.allSettled(
      files.map((f) => {
        const name = f.split("/").pop();
        return EnjoyApp[`${type.toLowerCase()}s` as "audios" | "videos"].create(
          f,
          {
            name,
            categoryId,
          }
        );
      })
    );

    const fulfilled = results
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value);
    const rejected = results.filter((r) => r.status === "rejected");

    if (fulfilled.length === 0) {
      toast.error(
        t("resourcesAdded", {
          fulfilled: fulfilled.length,
          rejected: rejected.length,
        })
      );
      setSubmitting(false);
      return;
    }

    toast.success(
      t("resourcesAdded", {
        fulfilled: fulfilled.length,
        rejected: rejected.length,
      })
    );

    setSubmitting(false);
    setOpen(false);
  };

  useEffect(() => {
    const defaultCategory = categories.find((c) => c.name === "Default");
    if (defaultCategory) {
      setCategoryId(defaultCategory.id);
    }
  }, [categories]);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="capitalize">
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          {t("batchAdd")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("batchAdd")}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-1 items-center gap-4 mb-4">
            <div className="col-span-1 flex space-x-2">
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
                  }
                }}
              >
                {t("localFile")}
              </Button>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="grid grid-cols-1 items-center gap-4 mb-4">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {files.length > 0 && (
            <div className="text-sm mt-4">
              {t("selectedFiles")}: {files.length}
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
            disabled={files.length === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting && (
              <LoaderIcon className="animate-spin w-4 mr-2" />
            )}
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
