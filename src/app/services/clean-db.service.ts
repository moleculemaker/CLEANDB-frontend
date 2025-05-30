import { Injectable } from "@angular/core";
import { Observable, from, map, of } from "rxjs";

import { BodyCreateJobJobTypeJobsPost, FilesService, Job, JobType, JobsService } from "../api/mmli-backend/v1";
import { EnvironmentService } from "./environment.service";

// import { CleanDbService as CleanDbApiService } from "../api/mmli-backend/v1"; // TODO: use the correct service
// import exampleStatus from '../../assets/example_status.json';
import example from '../../assets/example.db.json';
import { CleanDbRecord, cleanDbRecordRawToCleanDbRecord } from "../models/CleanDbRecord";
import { loadGzippedJson } from "../utils/loadGzippedJson";
import { ReactionSchemaRecord, ReactionSchemaRecordRaw, reactionSchemaRecordRawToReactionSchemaRecord } from "../models/ReactionSchemaRecord";

const exampleStatus: any = "WARNING: please provide your own example_status.json";
// const example: any = "WARNING: please provide your own example.json";

const reactionSchemaJson = loadGzippedJson<ReactionSchemaRecordRaw[]>('../../assets/rhea_reactions_ec.json.gz');

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
      return of(example.map(cleanDbRecordRawToCleanDbRecord));
    }
    return this.filesService.getResultsBucketNameResultsJobIdGet(jobType, jobID);
  }

  getData(): Observable<CleanDbRecord[]> {
    if (this.frontendOnly) {
      return of(example.map(cleanDbRecordRawToCleanDbRecord));
    }
    // TODO: get data from backend
    return of([]);
  }

  getReactionSchemaForEc(ec: string): Observable<ReactionSchemaRecord | null> {
    return from(reactionSchemaJson).pipe(
      map(data => data.find(r => r.ec_numbers.includes(ec))),
      map(data => data 
        ? reactionSchemaRecordRawToReactionSchemaRecord(data) 
        : null
      )
    );
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
