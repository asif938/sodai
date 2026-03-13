import { getItems } from "./actions/items";
import SodaiApp from "./components/SodaiApp";
import Script from "next/script";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await getItems();

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/sweetalert2@11"
        strategy="beforeInteractive"
      />
      <SodaiApp initialItems={items} />
    </>
  );
}
