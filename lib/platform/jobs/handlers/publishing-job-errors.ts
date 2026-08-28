export class PublishingJobExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishingJobExecutionError";
  }
}
