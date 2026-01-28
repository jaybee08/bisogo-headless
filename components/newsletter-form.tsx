"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email()
});

type Values = z.infer<typeof schema>;

export function NewsletterForm() {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const { register, handleSubmit, formState, reset } = form;

  const onSubmit = async (values: Values) => {
    // Minimal demo behavior – you can wire to your email tool later.
    // Core flows requested do not include newsletter backend.
    await new Promise((r) => setTimeout(r, 300));
    reset();
    alert(`Thanks! We'll email ${values.email} when there's something new.`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 sm:flex-row">
      <Input placeholder="you@domain.com" {...register("email")} />
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "…" : "Subscribe"}
      </Button>
    </form>
  );
}
