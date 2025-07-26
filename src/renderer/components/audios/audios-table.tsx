import { t } from "i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Button,
  PingPoint,
} from "@renderer/components/ui";
import {
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
  CircleAlertIcon,
} from "lucide-react";
import { formatDateTime, secondsToTimestamp } from "@renderer/lib/utils";
import { Link } from "react-router-dom";

export const AudiosTable = (props: {
  audios: Partial<AudioType>[];
  categories: CategoryType[];
  onEdit: (audio: Partial<AudioType>) => void;
  onDelete: (audio: Partial<AudioType>) => void;
}) => {
  const { audios, categories, onEdit, onDelete } = props;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="capitalize">{t("models.audio.name")}</TableHead>
          {/* <TableHead className="capitalize">{t("language")}</TableHead> */}
          <TableHead className="capitalize">
            {t("models.audio.category")}
          </TableHead>
          <TableHead className="capitalize">
            {" "}
            {t("models.audio.description")}{" "}
          </TableHead>
          <TableHead className="capitalize">
            {t("models.audio.duration")}
          </TableHead>
          {/* <TableHead className="capitalize">
            {t("models.audio.recordingsCount")}
          </TableHead>
          <TableHead className="capitalize">
            {t("models.audio.recordingsDuration")}
          </TableHead> */}
          <TableHead className="capitalize">
            {t("models.audio.createdAt")}
          </TableHead>
          {/*<TableHead className="capitalize">*/}
          {/*  {t("models.audio.isTranscribed")}*/}
          {/*</TableHead>*/}
          <TableHead className="capitalize">{t("actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {audios.map((audio) => (
          <TableRow key={audio.id}>
            <TableCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Link to={`/audios/${audio.id}`}>
                      <div className="flex items-center space-x-2">
                        {!audio.src && (
                          <CircleAlertIcon
                            data-tooltip-content={t("cannotFindSourceFile")}
                            data-tooltip-id="global-tooltip"
                            className="text-destructive w-4 h-4"
                          />
                        )}
                        <div className="text-base truncate cursor-pointer max-w-[280px]">
                          {audio.name}
                        </div>
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="p-2">
                      <p className="text-sm">{audio.name}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            <TableCell>
              <div className="truncate max-w-[180px]">
                {
                  categories.find(
                    (category) => category.id === audio.categoryId
                  )?.name
                }
              </div>
            </TableCell>
            <TableCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="truncate max-w-[180px]">
                      {audio.description}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{audio.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            {/* <TableCell>{audio.language ? audio.language : "-"}</TableCell> */}
            <TableCell>
              {audio.duration ? secondsToTimestamp(audio.duration) : "-"}
            </TableCell>
            {/* <TableCell>{audio.recordingsCount}</TableCell> */}
            {/* <TableCell>
              {secondsToTimestamp(audio.recordingsDuration / 1000)}
            </TableCell> */}
            <TableCell>{formatDateTime(audio.createdAt)}</TableCell>
            {/*<TableCell>*/}
            {/*  {audio.transcribed ? (*/}
            {/*    <CheckCircleIcon className="text-green-500 w-4 h-4" />*/}
            {/*  ) : (*/}
            {/*    <PingPoint colorClassName="bg-gray-500" className="w-2 h-2" />*/}
            {/*  )}*/}
            {/*</TableCell>*/}
            <TableCell>
              <div className="flex items-center">
                <Button
                  title={t("edit")}
                  variant="ghost"
                  onClick={() => onEdit(Object.assign({}, audio))}
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button
                  title={t("delete")}
                  variant="ghost"
                  onClick={() => onDelete(Object.assign({}, audio))}
                >
                  <TrashIcon className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
