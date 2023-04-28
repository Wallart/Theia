import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { ChatHistoryComponent } from './main/chat-history/chat-history.component';
import { ButtonsAreaComponent } from './main/buttons-area/buttons-area.component';
import { TopBarComponent } from './main/top-bar/top-bar.component';
import { BottomBarComponent } from './main/bottom-bar/bottom-bar.component';
import { HttpClientModule } from '@angular/common/http';
import { SettingsComponent } from './settings/settings.component';
import { AppRoutingModule } from './app-routing.module';
import { MainComponent } from './main/main.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatHistoryComponent,
    ButtonsAreaComponent,
    TopBarComponent,
    BottomBarComponent,
    SettingsComponent,
    MainComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
