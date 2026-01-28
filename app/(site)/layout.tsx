import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartToastStack } from "@/components/cart/cart-toast";


export default function SiteLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-[70vh]">{children}</main>
      <Footer />

      {/* Parallel route slot */}
      {modal}

      {/* Global cart drawer */}
      <CartToastStack />
    </>
  );
}