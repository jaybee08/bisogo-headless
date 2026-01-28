import Account from "@/app/(site)/account/page";
import { Modal } from "@/components/ui/modal";

export default function AccountModal() {
  return (
    <Modal title="Account">
      <Account />
    </Modal>
  );
}