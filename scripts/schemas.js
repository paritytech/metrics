const { readdirSync, writeFileSync, readFileSync } = require("fs");

const files = readdirSync("src/github/queries/");

for (const file of files) {
  if (file.endsWith(".graphql")) {
    console.log("Copying content of %s into a .ts file", file);
    const content = readFileSync(`src/github/queries/${file}`);
    writeFileSync(
      `src/github/queries/${file.replace(".graphql", ".ts")}`,
      `// Generated from ${file}\nexport default \`${content}\`;`,
    );
  }
}
