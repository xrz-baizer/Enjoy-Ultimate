import {
  Model,
  Table,
  Column,
  DataType,
  HasMany,
  AfterCreate,
  AfterUpdate,
  AfterDestroy,
} from "sequelize-typescript";
import { Audio } from "./audio";
import mainWindow from "@main/window";

@Table({
  tableName: "categories",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Category extends Model<Category> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name: string;

  @HasMany(() => Audio)
  audios: Audio[];

  @AfterCreate
  static notifyForCreate(category: Category) {
    this.notify(category, "create");
  }

  @AfterUpdate
  static notifyForUpdate(category: Category) {
    this.notify(category, "update");
  }

  @AfterDestroy
  static notifyForDestroy(category: Category) {
    this.notify(category, "destroy");
  }

  static notify(category: Category, action: "create" | "update" | "destroy") {
    if (!mainWindow.win) return;

    mainWindow.win.webContents.send("db-on-transaction", {
      model: "Category",
      id: category.id,
      action: action,
      record: category.toJSON(),
    });
  }
}