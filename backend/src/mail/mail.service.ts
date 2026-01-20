import { Injectable, Logger } from '@nestjs/common';

interface OfferNotificationPayload {
  wishTitle: string;
  ownerEmail?: string;
  donorEmail?: string;
  amount: number;
  hidden: boolean;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendOfferNotification(
    payload: OfferNotificationPayload,
  ): Promise<void> {
    const { wishTitle, ownerEmail, donorEmail, amount, hidden } = payload;

    if (!ownerEmail || !donorEmail) {
      this.logger.warn(
        `Skipping offer notification for "${wishTitle}" due to missing contact details. Hidden: ${hidden}.`,
      );
      return;
    }

    this.logger.log(
      `Notify ${ownerEmail} about donation for "${wishTitle}" from ${donorEmail} on amount ${amount}. Hidden: ${hidden}.`,
    );
  }
}
