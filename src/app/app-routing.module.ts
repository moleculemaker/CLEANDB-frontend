import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { FontMatchComponent } from "./components/font-match/font-match.component";
import { MainLayoutComponent } from "./components/main-layout/main-layout.component";
import { EffectPredictionComponent } from "src/app/components/effect-prediction/effect-prediction.component";
import { EffectPredictionResultComponent } from "src/app/components/effect-prediction-result/effect-prediction-result.component";


const routes: Routes = [
  { path: "", pathMatch:"full", component: MainLayoutComponent },
  { path: "font-match", component: FontMatchComponent },
  { path: 'effect-prediction', component: EffectPredictionComponent },
  { path: 'effect-prediction/result/:id', component: EffectPredictionResultComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
