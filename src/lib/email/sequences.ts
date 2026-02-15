import { db } from "@/lib/db";
import { resend } from "@/lib/resend";

export async function startSequence(subscriberId: string, sequenceId: string) {
  const existing = await db.sequenceProgress.findFirst({
    where: { subscriberId, sequenceId },
  });
  if (existing) return existing;

  const progress = await db.sequenceProgress.create({
    data: {
      subscriberId,
      sequenceId,
      currentStep: 0,
      status: "ACTIVE",
    },
  });

  await processNextStep(progress.id);
  return progress;
}

export async function processNextStep(progressId: string) {
  const progress = await db.sequenceProgress.findUnique({
    where: { id: progressId },
    include: {
      subscriber: true,
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
    },
  });

  if (!progress || progress.status !== "ACTIVE") return;
  if (progress.subscriber.status !== "ACTIVE") return;

  const nextStep = progress.sequence.steps[progress.currentStep];
  if (!nextStep) {
    await db.sequenceProgress.update({
      where: { id: progressId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "hello@aigovhub.com";

  try {
    await resend.emails.send({
      from: fromEmail,
      to: progress.subscriber.email,
      subject: nextStep.subject,
      html: `<p>Template: ${nextStep.templateId}</p>`,
    });

    await db.emailEvent.create({
      data: {
        subscriberId: progress.subscriberId,
        type: "SENT",
        subject: nextStep.subject,
      },
    });

    const nextNextStep = progress.sequence.steps[progress.currentStep + 1];
    await db.sequenceProgress.update({
      where: { id: progressId },
      data: {
        currentStep: progress.currentStep + 1,
        nextSendAt: nextNextStep
          ? new Date(Date.now() + nextNextStep.delayHours * 60 * 60 * 1000)
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to send sequence email:", error);
  }
}

export async function processDueSequences() {
  const activeProgress = await db.sequenceProgress.findMany({
    where: { status: "ACTIVE" },
    include: {
      subscriber: true,
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
    },
  });

  for (const progress of activeProgress) {
    const nextStep = progress.sequence.steps[progress.currentStep];
    if (!nextStep) {
      await db.sequenceProgress.update({
        where: { id: progress.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      continue;
    }

    const dueAt = progress.nextSendAt || new Date(progress.updatedAt.getTime() + nextStep.delayHours * 60 * 60 * 1000);

    if (new Date() >= new Date(dueAt)) {
      await processNextStep(progress.id);
    }
  }
}
