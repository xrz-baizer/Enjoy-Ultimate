import * as z from "zod";
import { t } from "i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@renderer/components/ui";
import { AppSettingsProviderContext } from "@renderer/context";
import { useContext, useEffect, useState } from "react";

const audioFormSchema = z.object({
  name: z
    .string()
    .min(3, {
      message: t("form.lengthMustBeAtLeast", {
        field: t("models.audio.name"),
        length: 3,
      }),
    })
    .max(50, {
      message: t("form.lengthMustBeLessThan", {
        field: t("models.audio.name"),
        length: 50,
      }),
    }),
  description: z.string().optional(),
  categoryId: z.string().optional(),
});

export const AudioEditForm = (props: {
  audio: Partial<AudioType>;
  onCancel: () => void;
  onFinish: () => void;
}) => {
  const { audio, onCancel, onFinish } = props;
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const [categories, setCategories] = useState<CategoryType[]>([]);

  const form = useForm<z.infer<typeof audioFormSchema>>({
    resolver: zodResolver(audioFormSchema),
    defaultValues: {
      name: audio?.name || "",
      description: audio?.description || "",
      categoryId: audio?.categoryId || "",
    },
  });

  useEffect(() => {
    EnjoyApp.categories.findAll().then((categories) => {
      setCategories(categories);
    });
  }, []);

  useEffect(() => {
    form.reset({
      name: audio?.name || "",
      description: audio?.description || "",
      categoryId: audio?.categoryId || "",
    });
  }, [audio]);

  if (!audio) return null;

  const onSubmit = async (data: z.infer<typeof audioFormSchema>) => {
    const { name, description, categoryId } = data;
    await EnjoyApp.audios.update(audio.id, {
      name,
      description,
      categoryId,
    });
    onFinish();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("models.audio.name")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("models.audio.namePlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("models.audio.description")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("models.audio.descriptionPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("models.audio.category")}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button type="submit">{t("save")}</Button>
        </div>
      </form>
    </Form>
  );
};
