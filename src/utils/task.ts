// 并发任务控制
function paralleTask(tasks: any[], paralleCount = 2, errCount = 0) {
  return new Promise<any[]>((resolve) => {
    if (tasks.length === 0) {
      resolve([]);
      return;
    }
    let nextIndex = 0;
    let finishCount = 0;
    let finishErrCount = 0;
    const reslist = new Array(tasks.length).fill(0);
    function _run() {
      const currentIndex = nextIndex;
      const task = tasks[nextIndex];
      nextIndex++;
      function finallyCb(res) {
        finishCount++;
        reslist[currentIndex] = res;
        if (nextIndex < tasks.length) {
          _run();
        } else if (finishCount === tasks.length) {
          resolve(reslist);
        }
      }
      task().then(finallyCb).catch(finallyCb);
    }
    for (let i = 0; i < paralleCount && i < tasks.length; i++) {
      _run();
    }
  });
}

export class ParalleTask {
  tasks: any[];
  canNext: boolean;
  paralleCount: number;
  private nextIndex: number;
  private finishCount: number;
  private finishErrCount: number;
  Promise: Promise<any[]>;
  constructor(tasks, config = { paralleCount: 3 }) {
    this.tasks = tasks;
    this.canNext = true;
    this.nextIndex = 0;
    this.finishCount = 0;
    this.finishErrCount = 0;
    this.paralleCount = config.paralleCount;
    this.Promise = this.run();
  }

  run = () => {
    this.canNext = true;
    const taskLength = this.tasks.length;
    return new Promise<any[]>((resolve) => {
      if (this.tasks.length === 0) {
        resolve([]);
        return;
      }

      const reslist = new Array(taskLength).fill(0);
      const finallyCb = (res, currentIndex) => {
        this.finishCount++;
        reslist[currentIndex] = res;
        if (this.nextIndex < taskLength) {
          _run();
        } else if (this.finishCount === taskLength) {
          console.log("全部完成");
          resolve(reslist);
        }
      };

      const _run = () => {
        if (!this.canNext) return;
        const currentIndex = this.nextIndex;
        const task = this.tasks[this.nextIndex];
        this.nextIndex++;

        task()
          .then((res) => finallyCb(res, currentIndex))
          .catch((res) => finallyCb(res, currentIndex));
      };
      for (let i = 0; i < this.paralleCount && i < taskLength; i++) {
        _run();
      }
    });
  };

  stop = () => {
    this.canNext = false;
  };

  then = (callBack) => {
    return this.Promise.then(callBack);
  };
}

export default paralleTask;
