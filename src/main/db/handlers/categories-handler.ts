import { ipcMain } from "electron";
import { Category } from "@main/db/models";

class CategoriesHandler {
  private HANDLERS = {
    "categories-create": this.create,
    "categories-update": this.update,
    "categories-destroy": this.destroy,
    "categories-find-all": this.findAll,
    "categories-find-one": this.findOne,
  };

  register() {
    for (const [channel, handler] of Object.entries(this.HANDLERS)) {
      ipcMain.handle(channel, handler);
    }
  }

  unregister() {
    for (const channel of Object.keys(this.HANDLERS)) {
      ipcMain.removeHandler(channel);
    }
  }

  async create(_event: Electron.IpcMainInvokeEvent, params: any) {
    return Category.create(params).then((category) => category.toJSON());
  }

  async update(
    _event: Electron.IpcMainInvokeEvent,
    id: string,
    params: any
  ) {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new Error("Category not found");
    }

    return category.update(params).then((category) => category.toJSON());
  }

  async destroy(_event: Electron.IpcMainInvokeEvent, id: string) {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new Error("Category not found");
    }

    return category.destroy();
  }

  async findAll(_event: Electron.IpcMainInvokeEvent, params: any) {
    return Category.findAll(params).then((categories) =>
      categories.map((c) => c.toJSON())
    );
  }

  async findOne(_event: Electron.IpcMainInvokeEvent, params: any) {
    return Category.findOne(params).then((category) => category?.toJSON());
  }
}

export const categoriesHandler = new CategoriesHandler();