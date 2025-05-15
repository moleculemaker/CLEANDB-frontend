import { Injectable } from "@angular/core";
import { Observable, map, of } from "rxjs";

import { BodyCreateJobJobTypeJobsPost, FilesService, Job, JobType, JobsService } from "../api/mmli-backend/v1";
import { EnvironmentService } from "./environment.service";

// import { CleanDbService as CleanDbApiService } from "../api/mmli-backend/v1"; // TODO: use the correct service
// import exampleStatus from '../../assets/example_status.json';
import example from '../../assets/example.db.json';
import { CleanDbRecord } from "../models/CleanDbRecord";

const exampleStatus: any = "WARNING: please provide your own example_status.json";
// const example: any = "WARNING: please provide your own example.json";

@Injectable({
  providedIn: "root",
})
export class CleanDbService {
  frontendOnly = false;

  constructor(
    private jobsService: JobsService,
    private filesService: FilesService,
    private environmentService: EnvironmentService,

    // private apiService: CleanDbApiService,
  ) {
    this.frontendOnly = this.environmentService.getEnvConfig().frontendOnly === "true";
  }

  createAndRunJob(jobType: JobType, requestBody: BodyCreateJobJobTypeJobsPost): Observable<Job> {
    if (this.frontendOnly) {
      return of(exampleStatus as any);
    }
    return this.jobsService.createJobJobTypeJobsPost(jobType, requestBody);
  }

  getResultStatus(jobType: JobType, jobID: string): Observable<Job> {
    if (this.frontendOnly) {
      return of(exampleStatus as any);
    }
    return this.jobsService.listJobsByTypeAndJobIdJobTypeJobsJobIdGet(jobType, jobID)
      .pipe(map((jobs) => jobs[0]));
  }

  getResult(jobType: JobType, jobID: string): Observable<any> {
    if (this.frontendOnly) {
      return of(example as any);
    }
    return this.filesService.getResultsBucketNameResultsJobIdGet(jobType, jobID);
  }

  getData(): Observable<CleanDbRecord[]> {
    if (this.frontendOnly) {
      return of(example);
    }
    // TODO: get data from backend
    return of([]);
  }

  getError(jobType: JobType, jobID: string): Observable<string> {
    if (this.frontendOnly) {
      return of('error');
    }
    return this.filesService.getErrorsBucketNameErrorsJobIdGet(jobType, jobID);
  }

  updateSubscriberEmail(jobType: JobType, jobId: string, email: string) {
    if (this.frontendOnly) {
      return of(exampleStatus as any);
    }
    return this.jobsService.patchExistingJobJobTypeJobsJobIdRunIdPatch(jobType, {
      job_id: jobId,
      run_id: 0,
      email: email,
    });
  }
}
