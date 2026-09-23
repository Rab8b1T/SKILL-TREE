import { ProgramMorning } from "@/components/program/morning";

export default async function Page({searchParams}:{searchParams:Promise<{day?:string}>}) {
  const requested=Number((await searchParams).day);
  const day=Number.isSafeInteger(requested)&&requested>0?requested:undefined;
  return <ProgramMorning initialDay={day} />;
}
