import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RadiografiaService } from '../radiografia.service';
import { PatientService } from '../patient.service';
import {
  Radiografia,
  isValidFileType,
  isValidFileSize,
  formatFileSize,
  isImageFile,
  isPdfFile,
  MAX_FILE_SIZE
} from '../models/radiografia.models';
import { Patient } from '../models/patient.models';
import { getPacienteIdFromRoute } from '../patient-route-id.util';

@Component({
  selector: 'app-xray-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './xray-gallery.html',
  styleUrl: './xray-gallery.scss'
})
export class XrayGalleryComponent implements OnInit {
  private radiografiaService = inject(RadiografiaService);
  private patientService = inject(PatientService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly patient = signal<Patient | null>(null);
  readonly radiografias = signal<Radiografia[]>([]);
  
  readonly dragOver = signal(false);
  readonly selectedFiles = signal<File[]>([]);
  readonly lightboxOpen = signal(false);
  readonly lightboxIndex = signal(0);
  
  readonly showDeleteModal = signal(false);
  readonly radiografiaToDelete = signal<Radiografia | null>(null);
  readonly deleting = signal(false);

  readonly isImageFile = isImageFile;
  readonly isPdfFile = isPdfFile;
  readonly formatFileSize = formatFileSize;

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES');
  }

  ngOnInit(): void {
    const id = getPacienteIdFromRoute(this.route);
    if (id && id !== 'nuevo' && /^\d+$/.test(id)) {
      this.loadPatientAndRadiografias(Number(id));
    } else {
      this.error.set('ID de paciente no válido');
    }
  }

  loadPatientAndRadiografias(patientId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.patientService.getById(patientId).subscribe({
      next: (patient) => {
        this.patient.set(patient);
        this.loadRadiografias(patientId);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar los datos del paciente.');
        console.error('Error loading patient:', err);
      }
    });
  }

  loadRadiografias(patientId: number): void {
    this.radiografiaService.getByPatientId(patientId).subscribe({
      next: (radiografias) => {
        this.radiografias.set(radiografias);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar las radiografías.');
        console.error('Error loading radiografias:', err);
      }
    });
  }

  // Drag & Drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);

    const files = Array.from(event.dataTransfer?.files || []);
    this.handleFiles(files);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.handleFiles(files);
    input.value = ''; // Reset input
  }

  handleFiles(files: File[]): void {
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      if (!isValidFileType(file)) {
        errors.push(`${file.name}: Tipo de archivo no permitido. Solo JPEG, PNG o PDF.`);
      } else if (!isValidFileSize(file)) {
        errors.push(`${file.name}: Archivo demasiado grande. Máximo ${formatFileSize(MAX_FILE_SIZE)}.`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      this.error.set(errors.join('\n'));
    } else {
      this.error.set(null);
    }

    this.selectedFiles.set(validFiles);

    if (validFiles.length > 0) {
      this.uploadFiles();
    }
  }

  uploadFiles(): void {
    const files = this.selectedFiles();
    const patient = this.patient();

    if (!files.length || !patient?.id) return;

    this.uploading.set(true);
    this.error.set(null);

    this.radiografiaService.upload(patient.id, files).subscribe({
      next: () => {
        this.uploading.set(false);
        this.selectedFiles.set([]);
        this.loadRadiografias(patient.id!);
      },
      error: (err) => {
        this.uploading.set(false);
        console.error('Error uploading files:', err);
        
        // Mostrar mensaje de error más específico
        let errorMessage = 'Error al subir las radiografías.';
        if (err.error && err.error.error) {
          errorMessage = err.error.error;
        } else if (err.status === 0) {
          errorMessage = 'No se puede conectar con el servidor. Verifica que el backend esté corriendo.';
        } else if (err.status === 401) {
          errorMessage = 'Error de autenticación. Por favor, inicia sesión nuevamente.';
        } else if (err.status === 404) {
          errorMessage = 'Endpoint no encontrado. Verifica la configuración del backend.';
        } else if (err.message) {
          errorMessage = `Error: ${err.message}`;
        }
        
        this.error.set(errorMessage);
      }
    });
  }

  // Lightbox
  openLightbox(index: number): void {
    this.lightboxIndex.set(index);
    this.lightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
  }

  nextImage(): void {
    const current = this.lightboxIndex();
    const total = this.radiografias().length;
    this.lightboxIndex.set((current + 1) % total);
  }

  prevImage(): void {
    const current = this.lightboxIndex();
    const total = this.radiografias().length;
    this.lightboxIndex.set((current - 1 + total) % total);
  }

  // Delete
  confirmDelete(radiografia: Radiografia): void {
    this.radiografiaToDelete.set(radiografia);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.radiografiaToDelete.set(null);
    this.deleting.set(false);
  }

  deleteRadiografia(): void {
    const radiografia = this.radiografiaToDelete();
    if (!radiografia) return;

    this.deleting.set(true);
    this.error.set(null);

    this.radiografiaService.delete(radiografia.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.cancelDelete();
        const patientId = this.patient()?.id;
        if (patientId) {
          this.loadRadiografias(patientId);
        }
      },
      error: (err) => {
        this.deleting.set(false);
        this.cancelDelete();
        this.error.set('Error al eliminar la radiografía.');
        console.error('Error deleting radiografia:', err);
      }
    });
  }

  getFileUrl(radiografia: Radiografia): string {
    return this.radiografiaService.getFileUrl(radiografia.ruta_archivo);
  }

  goBack(): void {
    this.router.navigate(['/app/pacientes']);
  }

  goToPatientEdit(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id]);
    }
  }
}
