import TEMPLATE from "./template";

export const generateSite = (title: string, content: string): string =>
  TEMPLATE.replace("%NAME%", title).replace("%CONTENT%", content);
