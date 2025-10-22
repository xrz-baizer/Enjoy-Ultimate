import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  toast,
  Checkbox,
  ScrollArea,
} from "@renderer/components/ui";
import { Trash2Icon, LoaderIcon } from "lucide-react";
import { t } from "i18next";
import { useState, useContext } from "react";
import { AppSettingsProviderContext } from "@renderer/context";

export const MediaBatchDeleteButton = (props: {
  type?: "Audio" | "Video";
  items: Array<AudioType | VideoType>;
}) => {
  const { type = "Audio", items = [] } = props;
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleOpen = (value: boolean) => {
    if (deleting) {
      setOpen(true);
    } else {
      setOpen(value);
      if (!value) {
        // Clear selection when closing
        setSelectedIds(new Set());
      }
    }
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);

    const results = await Promise.allSettled(
      Array.from(selectedIds).map((id) => {
        return EnjoyApp[`${type.toLowerCase()}s` as "audios" | "videos"].destroy(
          id
        );
      })
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    if (fulfilled.length === 0) {
      toast.error(
        t("resourcesDeleted", {
          fulfilled: fulfilled.length,
          rejected: rejected.length,
        })
      );
      setDeleting(false);
      return;
    }

    toast.success(
      t("resourcesDeleted", {
        fulfilled: fulfilled.length,
        rejected: rejected.length,
      })
    );

    setDeleting(false);
    setSelectedIds(new Set());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="capitalize">
          <Trash2Icon className="mr-2 h-4 w-4" />
          {t("batchDelete")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("batchDelete")}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center space-x-2 mb-4 pb-2 border-b">
            <Checkbox
              id="select-all"
              checked={selectedIds.size === items.length && items.length > 0}
              onCheckedChange={handleToggleAll}
              disabled={deleting}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              {t("selectAll")} ({selectedIds.size}/{items.length})
            </label>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noData")}
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-accent"
                  >
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={(checked) =>
                        handleToggleItem(item.id, checked as boolean)
                      }
                      disabled={deleting}
                    />
                    <label
                      htmlFor={`item-${item.id}`}
                      className="flex-1 text-sm cursor-pointer truncate"
                    >
                      {item.name}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {selectedIds.size > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                {t("batchDeleteWarning", { count: selectedIds.size })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            disabled={deleting}
            onClick={() => {
              setOpen(false);
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={selectedIds.size === 0 || deleting}
            onClick={handleDelete}
          >
            {deleting && <LoaderIcon className="animate-spin w-4 mr-2" />}
            {t("delete")} ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
