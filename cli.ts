import { parseArgs } from "@std/cli";
import { z } from "zod";
import { parseReceipt } from "./parse-reciept.ts";

const argsSchema = z.object({
  file: z.string(),
});

const args = parseArgs(Deno.args);

const { success, data } = argsSchema.safeParse(args);

if (!success) {
  console.log("Usage: binary --file <file>");
  Deno.exit(1);
}

const { file } = data;

const products = await parseReceipt(file);

const namesPrompt = prompt("Navn på deltagere:");
if (!namesPrompt) {
  console.log("Ingen deltagere");
  Deno.exit(1);
}

const names = ["Delt", ...namesPrompt.split(",").map((name) => name.trim())];

const createBasicPrompt = (product: string, price: number) => {
  return `Hvem har kjøpt ${product} (${price} kr)?`;
};

const longesPromptLength = products.reduce((acc, product) => {
  const promptLength = createBasicPrompt(product.name, product.price).length;
  return promptLength > acc ? promptLength : acc;
}, 0);

const belongsTo = (product: string, price: number) => {
  let id = null;
  while (!id) {
    const q = createBasicPrompt(product, price);
    const padSize = longesPromptLength - q.length + 3;
    const n = `(${names
      .map((name, index) => `${index}: ${name}`)
      .join(", ")}):`;
    const np = n.padStart(padSize + n.length, " ");

    id = prompt(`${q}${np}`);
  }

  return id;
};

const productsWithOwners = products.map((product) => {
  const owner = belongsTo(product.name, product.price);
  return { ...product, owner: parseInt(owner) };
});

const totals = productsWithOwners.reduce(
  (acc, product) => {
    if (product.owner === 0) {
      acc.shared += product.price;
    } else {
      acc.individual[product.owner] += product.price;
    }

    return acc;
  },
  {
    shared: 0,
    individual: names.map(() => 0),
  }
);

console.log("");

console.log(
  `Totalt: ${(
    totals.shared + totals.individual.reduce((acc, price) => acc + price, 0)
  ).toFixed(2)} kr`
);
console.log(`Delte utgifer: ${totals.shared.toFixed(2)} kr`);
console.log("");
console.log("Individuelle utgifter:");
names
  .filter((_, i) => i !== 0)
  .forEach((name, index) => {
    console.log(
      `${name}: ${(totals.individual[index + 1] + totals.shared).toFixed(
        2
      )} kr (individuelt: ${totals.individual[index + 1].toFixed(2)} kr)`
    );
  });
