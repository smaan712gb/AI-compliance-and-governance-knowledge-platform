import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/send-email";
import { getTemplateComponent } from "@/lib/email/templates";

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

  const templateData = {
    name: progress.subscriber.name ?? undefined,
    email: progress.subscriber.email,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://aigovhub.com",
  };

  const react = getTemplateComponent(nextStep.templateId, templateData);

  if (!react) {
    console.error(
      `No template found for templateId: ${nextStep.templateId}`,
    );
    return;
  }

  try {
    const result = await sendEmail({
      to: progress.subscriber.email,
      subject: nextStep.subject,
      react,
    });

    if (!result.success) {
      console.error("Failed to send sequence email:", result.error);
      return;
    }

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
