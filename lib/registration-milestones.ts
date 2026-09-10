import { STATUS_BY_ID, type RegistrationApplication } from "./registration-data";
import { latestActivityFirst, activityContent } from "./registration-activity";
import { isTitleIssued } from "./notification-policy";

export function significantRegistrationEvent(application: RegistrationApplication) {
  const event = latestActivityFirst(application.history).find(event => {
    const { title } = activityContent(event);
    return !/^(fin de plazo|actualizaci[oó]n|cambio de titular|actualizaci[oó]n de representante)\b/i.test(title);
  });
  const title = event ? activityContent(event).title : application.recentEvent;
  return { title: title || STATUS_BY_ID[application.statusId].label, date: event?.date,
    status: application.statusId === "registered" && isTitleIssued(title) ? "Título de marca emitido" : STATUS_BY_ID[application.statusId].label };
}
