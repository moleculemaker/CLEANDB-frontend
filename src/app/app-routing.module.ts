import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { FontMatchComponent } from "./components/font-match/font-match.component";
import { MainLayoutComponent } from "./components/main-layout/main-layout.component";
import { AboutPageComponent } from "./pages/about-page/about-page.component";
import { EffectPredictionComponent } from "~/app/pages/effect-prediction/effect-prediction.component";
import { EffectPredictionResultComponent } from "~/app/pages/effect-prediction-result/effect-prediction-result.component";
import { DatabaseSearchComponent } from "./pages/database-search/database-search.component";


const routes: Routes = [
  { 
    path: "", 
    component: MainLayoutComponent,
    children: [
      { path: 'about', component: AboutPageComponent },
      { path: "database-search", component: DatabaseSearchComponent },
      { path: 'effect-prediction', component: EffectPredictionComponent },
      { path: 'effect-prediction/result/:id', component: EffectPredictionResultComponent },
    ]
  },
  { path: "font-match", component: FontMatchComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
