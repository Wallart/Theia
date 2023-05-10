import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { MainComponent } from './main/main.component';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { BrowserModule } from '@angular/platform-browser';
import { SettingsComponent } from './settings/settings.component';
import { TopBarComponent } from './main/top-bar/top-bar.component';
import { HighlightModule, HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';
import { BottomBarComponent } from './main/bottom-bar/bottom-bar.component';
import { ChatHistoryComponent } from './main/chat-history/chat-history.component';
import { ButtonsAreaComponent } from './main/buttons-area/buttons-area.component';
import { VideoFeedbackComponent } from './video-feedback/video-feedback.component';
import { TabsBarComponent } from './main/tabs-bar/tabs-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatHistoryComponent,
    ButtonsAreaComponent,
    TopBarComponent,
    BottomBarComponent,
    SettingsComponent,
    MainComponent,
    VideoFeedbackComponent,
    TabsBarComponent
  ],
  imports: [
      BrowserModule,
      HttpClientModule,
      AppRoutingModule,
      FormsModule,
      HighlightModule
  ],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: {
        fullLibraryLoader: () => import('highlight.js'),
        themePath: 'assets/styles/github.css'
      }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
