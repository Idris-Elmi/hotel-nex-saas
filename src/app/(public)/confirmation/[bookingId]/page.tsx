import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ bookingId: string }>;
};

export default async function ConfirmationPage({ params }: PageProps) {
  const { bookingId } = await params;
  redirect(`/booking/confirmation/${bookingId}`);
}
