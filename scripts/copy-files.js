const { readdirSync, writeFileSync, readFileSync } = require("fs");

const files = readdirSync("src/github/queries/");

/**
 * Copy a file and replace it's extension
 * @param {string} fileName Name of the file to copy
 * @param {string} extension New extension to put
 */
const copyFile = (fileName, extension) => {
  console.log("Copying content of %s into a .ts file", fileName);
  const content = readFileSync(fileName);
  const oldExtension = fileName.split(".").pop();
  writeFileSync(
    fileName.replace(oldExtension, extension),
    `// Generated from ${fileName}\nexport default \`${content}\`;`,
  );
}

for (const file of files) {
  if (file.endsWith(".graphql")) {
    copyFile(`src/github/queries/${file}`, "ts");
  }
}

copyFile("src/render/template.html", "ts");
