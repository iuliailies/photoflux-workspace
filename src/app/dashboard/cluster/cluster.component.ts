import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { InspectPhotoModalComponent } from 'src/app/shared/components/inspect-photo-modal/inspect-photo-modal.component';
import {
  TOAST_STATE,
  ToastService,
} from 'src/app/shared/components/toast/toast.service';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { Cluster, PhotoSortType } from 'src/app/shared/models/board.model';
import { Photo, maxCompressedSize } from 'src/app/shared/models/photo.model';
import { MinioService } from 'src/app/shared/services/minio.service';
import { PhotoService } from 'src/app/shared/services/photo.service';
import { StarService } from 'src/app/shared/services/star.service';
import { NgxImageCompressService } from 'ngx-image-compress';

@Component({
  selector: 'app-cluster',
  templateUrl: './cluster.component.html',
  styleUrls: ['./cluster.component.sass'],
})
export class ClusterComponent implements OnInit, AfterViewInit {
  @ViewChild('clusterElement') clusterElement!: ElementRef;
  @Input() cluster!: Cluster;
  @Input() focused: boolean = false;
  @Input() sortTypeChangedSubject: Subject<PhotoSortType> = new Subject<PhotoSortType>();
  @Output() clusterLoadedFirstTime = new EventEmitter();
  sortType: PhotoSortType = 'created_at';
  photos: Photo[] = [];
  categoryName!: string;
  perfectMatch = false;
  error = false;
  loading = true;
  next?: string;

  private worker!: Worker;

  constructor(
    private photoService: PhotoService,
    private starService: StarService,
    private minioService: MinioService,
    private sanitizer: DomSanitizer,
    private toastService: ToastService,
    private modalService: ModalService,
    private imageCompress: NgxImageCompressService
  ) {}

  ngOnInit(): void {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/shared/web-workers/image-worker.worker.ts', import.meta.url));
      this.worker.onmessage = this.handleWorkerMessages.bind(this);
    }

    this.listPhotos();
    this.sortTypeChangedSubject.subscribe((type) => {
      this.resetValues();
      this.sortType = type;
      this.listPhotos();
    });
  }

  ngAfterViewInit(): void {
    (this.clusterElement!.nativeElement as HTMLElement).style.left =
      this.cluster.position.x + 'px';
    (this.clusterElement!.nativeElement as HTMLElement).style.top =
      this.cluster.position.y + 'px';
  }

  resetValues(): void {
    this.next = undefined;
    this.photos = [];
    this.error = false;
  }

  listPhotos(): void {
    if (this.next == '') {
      return;
    }
    this.loading = true;
    this.photoService
      .listPhotos(this.cluster.categoryIds, this.sortType, this.next)
      .subscribe(
        (resp) => {
          this.categoryName = resp.categoryName;
          this.perfectMatch = this.cluster.categoryIds.length > 1;
          this.next = resp.next;

          this.photos.push(...resp.data);

          this.getPhotoFiles(resp.data);
        },
        (err) => {
          this.error = true;
          this.loading = false;
        }
      );
  }

  getPhotoFiles(photos: Photo[]): void {
    const urls = photos.map((photo) => photo.href);
    if (this.worker) {
      this.worker.postMessage({ type: 'fetchImages', data: { urls } });
    } else {
      this.loading = false;
    }
  }

  private async handleWorkerMessages(event: MessageEvent) {
    const { type, results } = event.data;
  
    if (type === 'fetchImages') {
      const length = results.length;
      const updatedPhotos = [...this.photos];
  
      for (let index = 0; index < length; index++) {
        const result = results[index];
        if (result.error) continue;
  
        const photoIndex = this.photos.findIndex((p) => p.href === result.url);
        if (photoIndex === -1) continue;
  
        const objectUrl = URL.createObjectURL(result.blob);
        updatedPhotos[photoIndex].file = new File([result.blob], '');
        updatedPhotos[photoIndex].url = objectUrl;

        setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  
        try {
          const compressed = await this.imageCompress.compressFile(
            objectUrl,
            -1,
            undefined,
            50,
            maxCompressedSize,
            maxCompressedSize
          );
  
          updatedPhotos[photoIndex].compressedUrl = compressed;
          updatedPhotos[photoIndex].url = this.sanitizeUrl(compressed);
  
        } catch (error) {
          console.error(`Error compressing image: ${error}`);
        }
      }
  
      this.photos = updatedPhotos;
      this.loading = false;
      this.clusterLoadedFirstTime.emit();
    }
  }

  openPhotoModal(photo: Photo): void {
    if (!this.focused) {
      return;
    }
    const modalRef = this.modalService.open(InspectPhotoModalComponent, {
      size: 'fullscreen',
    });
    modalRef.componentInstance.photo = photo;
  }

  starPhoto(photo: Photo): void {
    this.starService.starPhoto(photo.id).subscribe(
      (resp) => {
        photo.starred = resp;
        photo.numberStars += resp ? 1 : -1;
      },
      (err) => {
        this.toastService.showToast(TOAST_STATE.danger, [
          { toastMessage: `<div>Error starring photo.</div>` },
        ]);
      }
    );
  }

  sanitizeUrl(url: string): string {
    return this.sanitizer.bypassSecurityTrustUrl(url) as string;
  }
}
