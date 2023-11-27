import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { EditComponent } from './edit/edit.component';
import { SettingsComponent } from './settings/settings.component';
import { VideoFeedbackComponent } from './video-feedback/video-feedback.component';


export const ROUTES: Routes = [
  {path: '', component: MainComponent},
  {path: 'edit', component: EditComponent},
  {path: 'settings', component: SettingsComponent},
  {path: 'video', component: VideoFeedbackComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(ROUTES, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
