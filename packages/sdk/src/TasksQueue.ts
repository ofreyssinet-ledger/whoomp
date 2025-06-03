export class TaskQueue {
  private tail: Promise<void> = Promise.resolve();

  addTask<T>(task: () => Promise<T>): Promise<T> {
    // Chain the new task onto the tail of the queue
    const result = this.tail.then(() => task());

    // Ensure the queue proceeds even if a task rejects
    this.tail = result.then(() => {}).catch(() => {});

    return result;
  }
}
