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
import { Subject, catchError, finalize, forkJoin, of } from 'rxjs';
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
  @Input() sortTypeChangedSubject: Subject<PhotoSortType> =
    new Subject<PhotoSortType>();
  @Output() clusterLoadedFirstTime = new EventEmitter();
  sortType: PhotoSortType = 'created_at';
  photos: Photo[] = [];
  categoryName!: string;
  perfectMatch = false;
  error = false;
  loading = true;
  next?: string;
  private observer!: IntersectionObserver;

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

    // Initialize Intersection Observer for lazy loading
    this.initLazyLoading();
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
          this.getPhotoFiles(resp.data);
        },
        (err) => {
          //TODO: error handling
        }
      );
  }

  getPhotoFiles(photos: Photo[]): void {
    const length = photos.length;
    // TODO: improve, move minio interaction into the service
    const request = photos.map((photo) =>
      this.minioService.getPhoto(photo.href)
    );
    forkJoin(request)
      .pipe(
        finalize(() => {
          this.clusterLoadedFirstTime.emit();
          this.loading = false;
        })
      )
      .subscribe((responses) => {
        this.photos.push(...photos);
        (responses as any[]).forEach((resp, index) => {
          if (resp === false) {
            return;
          }
          this.photos[this.photos.length - length + index].file = new File(
            [resp],
            ''
          );
          this.imageCompress
            .compressFile(
              URL.createObjectURL(resp),
              -1,
              undefined,
              50,
              maxCompressedSize,
              maxCompressedSize
            )
            .then((result) => {
              this.photos[this.photos.length - length + index].compressedUrl =
                result;
            });
          this.photos[this.photos.length - length + index].url =
            this.sanitizeUrl(
              URL.createObjectURL(
                this.photos[this.photos.length - length + index].file!
              )
            );
        });

        // Apply Intersection Observer after all images are fetched
        this.applyLazyLoading();
      });
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

  private initLazyLoading(): void {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
  
          const img = entry.target as HTMLImageElement;
          const dataSrc = img.getAttribute('data-src');
          console.log("Image intersecting...",);
  
          if (dataSrc) {
            img.src = dataSrc;
            img.classList.remove('lazy-load');
            this.observer.unobserve(img); // Stop observing once loaded
          } else {
            console.error("Lazy loading error: data-src is missing!", img);
          }
        }
      });
    }, {
      root: null, // Observe against viewport
      rootMargin: '100px', // Preload images slightly before they appear
      threshold: 0.1, // Load when 10% of the image is visible
    });
  }

  /** Apply lazy loading to images after they are added to the DOM */
  private applyLazyLoading(): void {
    document.querySelectorAll('.lazy-load').forEach((img) => this.observer.observe(img));
  }
}
