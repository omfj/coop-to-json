import { readPdfPages } from "pdf-text-reader";

export const parseReceipt = async (file: string) => {
  const fileData = await Deno.readFile(file);
  const pages = await readPdfPages({
    data: fileData,
  });

  const pagesLines = pages.map((page) => page.lines);
  const page1 = pagesLines[0];

  const startOfContent = page1.findIndex((line) => line === "");
  const endOfContent = page1.findIndex((line, index) => {
    if (index < startOfContent) return false;
    return line.match(/^Totalt \(\d+ Artikler\) \d+(\.\d{1,2})?$/);
  });

  const content = page1.slice(startOfContent, endOfContent);

  const products = content
    .filter((line) => {
      const words = line.split(" ");
      const price = words[words.length - 1];
      const isPrice = price.match(/^\d+(\.\d{1,2})?$/);
      return isPrice;
    })
    .map((line) => {
      const id = crypto.randomUUID();
      const words = line.split(" ");
      const price = parseFloat(words[words.length - 1]);
      const name = words.slice(0, words.length - 1).join(" ");
      return { id, name, price };
    });

  return products;
};
