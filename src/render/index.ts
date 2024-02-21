export const generateSite = (title: string, content: string): string =>
  title.replace("%NAME%", title).replace("%CONTENT%", content);
