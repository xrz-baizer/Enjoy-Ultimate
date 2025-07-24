import { t } from "i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  toast,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@renderer/components/ui";
import { AppSettingsProviderContext } from "@renderer/context";
import { useContext, useState, useEffect } from "react";
import { EditIcon, TrashIcon, CheckIcon, XIcon } from "lucide-react";

export const CategoryManager = () => {
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [editingCategory, setEditingCategory] = useState<CategoryType | null>(
    null
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchCategories = () => {
    EnjoyApp.categories.findAll({ order: [["name", "ASC"]] }).then(setCategories);
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    EnjoyApp.categories
      .create({ name: newCategoryName.trim() })
      .then(() => {
        toast.success(t("categoryAdded"));
        setNewCategoryName("");
        setIsAdding(false);
        fetchCategories();
      })
      .catch((err) => toast.error(err.message));
  };

  const handleUpdateCategory = (id: string, name: string) => {
    if (!name.trim()) {
      setEditingCategory(null);
      return;
    }
    EnjoyApp.categories
      .update(id, { name: name.trim() })
      .then(() => {
        toast.success(t("categoryUpdated"));
        setEditingCategory(null);
        fetchCategories();
      })
      .catch((err) => toast.error(err.message));
  };

  const handleDeleteCategory = (id: string) => {
    EnjoyApp.categories
      .destroy(id)
      .then(() => {
        toast.success(t("categoryDeleted"));
        fetchCategories();
      })
      .catch((err) => toast.error(err.message));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("ManageCategories")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ManageCategories")}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                {editingCategory?.id === category.id ? (
                  <Input
                    defaultValue={category.name}
                    onBlur={(e) =>
                      handleUpdateCategory(category.id, e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleUpdateCategory(category.id, e.currentTarget.value);
                      if (e.key === "Escape") setEditingCategory(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <span>{category.name}</span>
                )}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingCategory(category)}
                  >
                    <EditIcon className="w-4 h-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <TrashIcon className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("areYouSure")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("deleteCategoryConfirmation", {
                            name: category.name,
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          {t("confirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

          {isAdding ? (
            <div className="flex items-center space-x-2">
              <Input
                placeholder={t("NewCategoryName")}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                  if (e.key === "Escape") setIsAdding(false);
                }}
              />
              <Button size="lg" onClick={handleAddCategory}>
                <CheckIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAdding(true)}
            >
              {t("addCategory")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
