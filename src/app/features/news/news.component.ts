import { Component } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from "../../shared/components/footer/footer.component";

@Component({
  selector: 'app-news',
  imports: [NavbarComponent, FooterComponent],
  standalone: true,
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss'
})
export class NewsComponent {

}
