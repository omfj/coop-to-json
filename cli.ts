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

const namesPrompt = prompt("Names of participants");
if (!namesPrompt) {
  console.log("No names provided");
  Deno.exit(1);
}

const names = ["Shared", ...namesPrompt.split(",").map((name) => name.trim())];

const createPrompt = (product: string, price: number) => {
  return `Who does ${product} (${price} kr) belong to? (0: Shared, ${names
    .map((name, index) => `${index + 1}: ${name}`)
    .join(", ")})`;
};

const longesPromptLength = products.reduce((acc, product) => {
  const promptLength = createPrompt(product.name, product.price).length;
  return promptLength > acc ? promptLength : acc;
}, 0);

const belongsTo = (product: string, price: number) => {
  let id = null;
  while (!id) {
    const q = `Who does ${product} (${price} kr) belong to?`;
    const n = `(${names
      .map((name, index) => `${index}: ${name}`)
      .join(", ")})`.padStart(longesPromptLength - q.length, " ");

    id = prompt(`${q}${n}`);
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
      `${name}: ${(totals.individual[index] + totals.shared).toFixed(
        2
      )} kr (individuelt: ${totals.individual[index].toFixed(2)} kr)`
    );
  });
