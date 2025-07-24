import { useEffect, useState, useReducer, useContext } from "react";
import {
  MediaAddButton,
  AudiosTable,
  AudioEditForm,
  LoaderSpin,
  CategoryManager,
} from "@renderer/components";
import { t } from "i18next";
import {
  Button,
  AlertDialog,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  toast,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  DialogDescription,
  AlertDialogTrigger,
} from "@renderer/components/ui";
import {
  DbProviderContext,
  AppSettingsProviderContext,
} from "@renderer/context";
import { audiosReducer } from "@renderer/reducers";
import { useDebounce } from "@uidotdev/usehooks";

export const AudiosComponent = () => {
  const { addDblistener, removeDbListener } = useContext(DbProviderContext);
  const { EnjoyApp } = useContext(AppSettingsProviderContext);

  const [audios, dispatchAudios] = useReducer(audiosReducer, []);
  const [hasMore, setHasMore] = useState(true);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [orderBy, setOrderBy] = useState<string | null>("nameDesc");
  const debouncedQuery = useDebounce(query, 500);

  const [editing, setEditing] = useState<Partial<AudioType> | null>(null);
  const [deleting, setDeleting] = useState<Partial<AudioType> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    EnjoyApp.categories.findAll().then((_categories) => {
      setCategories(_categories);
    });
  };

  const onDbUpdate = (event: CustomEvent) => {
    const { record, action, model } = event.detail || {};
    if (!record) return;

    if (model === "Audio") {
      if (action === "destroy") {
        dispatchAudios({ type: "destroy", record });
      } else if (action === "create") {
        dispatchAudios({ type: "create", record });
      } else if (action === "update") {
        dispatchAudios({ type: "update", record });
      }
    } else if (model === "Transcription" && action === "update") {
      dispatchAudios({
        type: "update",
        record: {
          id: record.targetId,
          transcribing: record.state === "processing",
          transcribed: record.state === "finished",
        },
      });
    } else if (model === "Category") {
      fetchCategories();
    }
  };

  useEffect(() => {
    addDblistener(onDbUpdate);
    fetchCategories();

    return () => {
      removeDbListener(onDbUpdate);
    };
  }, []);

  const fetchAudios = async (options?: { offset: number }) => {
    if (loading) return;
    const { offset = audios.length } = options || {};

    setLoading(true);
    const limit = 500;

    const order = [];
    if (orderBy !== "nameAsc" && orderBy !== "nameDesc") {
      switch (orderBy) {
        case "updatedAtDesc":
          order.push(["updatedAt", "DESC"]);
          break;
        case "createdAtDesc":
          order.push(["createdAt", "DESC"]);
          break;
        case "createdAtAsc":
          order.push(["createdAt", "ASC"]);
          break;
        case "recordingsDurationDesc":
          order.push(["recordingsDuration", "DESC"]);
          break;
        case "recordingsCountDesc":
          order.push(["recordingsCount", "DESC"]);
          break;
        default:
          order.push(["createdAt", "DESC"]);
      }
    }

    let where = {};
    if (category !== "all") {
      where = { ...where, categoryId: category };
    }

    EnjoyApp.audios
      .findAll({
        offset,
        limit,
        order,
        where,
        query: debouncedQuery,
      })
      .then((_audios) => {
        setHasMore(_audios.length >= limit);
        const collator = new Intl.Collator(undefined, {
          numeric: true,
          sensitivity: "base",
        });

        if (orderBy === "nameAsc") {
          _audios.sort((a, b) => collator.compare(a.name, b.name));
        } else if (orderBy === "nameDesc") {
          _audios.sort((a, b) => collator.compare(b.name, a.name));
        }

        if (offset === 0) {
          dispatchAudios({ type: "set", records: _audios });
        } else {
          dispatchAudios({ type: "append", records: _audios });
        }
      })
      .catch((err) => {
        toast.error(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAudios({ offset: 0 });
  }, [debouncedQuery, category, orderBy]);

  return (
    <>
      <div className="">
        <div className="flex flex-wrap items-center gap-5 mb-4">

          <MediaAddButton type="Audio" categories={categories} />
          <CategoryManager />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="max-w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={orderBy} onValueChange={setOrderBy}>
            <SelectTrigger className="max-w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="nameAsc">{t("nameAsc")}</SelectItem>
                <SelectItem value="nameDesc">{t("nameDesc")}</SelectItem>
                <SelectItem value="updatedAtDesc">
                  {t("updatedAtDesc")}
                </SelectItem>
                <SelectItem value="createdAtDesc">
                  {t("createdAtDesc")}
                </SelectItem>
                <SelectItem value="createdAtAsc">
                  {t("createdAtAsc")}
                </SelectItem>
                <SelectItem value="recordingsDurationDesc">
                  {t("recordingsDurationDesc")}
                </SelectItem>
                <SelectItem value="recordingsCountDesc">
                  {t("recordingsCountDesc")}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Input
            className="max-w-48"
            placeholder={t("search")}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/*<AlertDialog>*/}
          {/*  <AlertDialogTrigger asChild>*/}
          {/*    <Button variant="secondary">{t("cleanUp")}</Button>*/}
          {/*  </AlertDialogTrigger>*/}
          {/*  <AlertDialogContent>*/}
          {/*    <AlertDialogTitle>{t("cleanUp")}</AlertDialogTitle>*/}
          {/*    <AlertDialogDescription>*/}
          {/*      {t("cleanUpConfirmation")}*/}
          {/*    </AlertDialogDescription>*/}
          {/*    <AlertDialogFooter>*/}
          {/*      <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>*/}
          {/*      <AlertDialogAction*/}
          {/*        onClick={() =>*/}
          {/*          EnjoyApp.audios*/}
          {/*            .cleanUp()*/}
          {/*            .then(() => toast.success(t("cleanedUpSuccessfully")))*/}
          {/*        }*/}
          {/*      >*/}
          {/*        {t("confirm")}*/}
          {/*      </AlertDialogAction>*/}
          {/*    </AlertDialogFooter>*/}
          {/*  </AlertDialogContent>*/}
          {/*</AlertDialog>*/}
        </div>

        {audios.length === 0 ? (
          loading ? (
            <LoaderSpin />
          ) : (
            <div className="flex items-center justify-center h-48 border border-dashed rounded-lg">
              {t("noData")}
            </div>
          )
        ) : (
          <AudiosTable
            audios={audios}
            onEdit={(audio) => setEditing(audio)}
            onDelete={(audio) => setDeleting(audio)}
          />
        )}
      </div>

      {!loading && hasMore && (
        <div className="flex items-center justify-center my-4">
          <Button variant="link" onClick={() => fetchAudios()}>
            {t("loadMore")}
          </Button>
        </div>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(value) => {
          if (value) return;
          setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editResource")}</DialogTitle>
            <DialogDescription className="sr-only">
              edit audio
            </DialogDescription>
          </DialogHeader>

          <AudioEditForm
            audio={editing}
            onCancel={() => setEditing(null)}
            onFinish={() => setEditing(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(value) => {
          if (value) return;
          setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteResource")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="break-all">
                {t("deleteResourceConfirmation", {
                  name: deleting?.name || "",
                })}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={() => {
                if (!deleting) return;
                EnjoyApp.audios
                  .destroy(deleting.id)
                  .catch((err) => toast.error(err.message))
                  .finally(() => setDeleting(null));
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
