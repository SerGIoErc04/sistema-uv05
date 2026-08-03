import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  ui = inject(UiFeedbackService);
}
