const { readdirSync, writeFileSync, readFileSync } = require("fs");

const files = readdirSync("src/github/");

for (const file of files) {
  if (file.endsWith(".graphql")) {
    console.log("Copying content of %s into a .ts file", file);
    const content = readFileSync(`src/github/${file}`);
    writeFileSync(
      `src/github/${file.replace(".graphql", ".ts")}`,
      `// Generated from ${file}\nexport default \`${content}\`;`,
    );
  }
}
