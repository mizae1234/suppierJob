'use client';

import React, { useMemo } from 'react';
import { Job, UserRole, CarWashItem, JobEvidence, JobStatus } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost, getJobScheduleDate, getScheduleBadge, getVehicleLabel, getSlideDirection } from '@/lib/job-utils';
import { useApp } from '@/context/AppContext';
import { Sparkles, Truck, Check, RotateCcw, Eye, MapPin, Building2 } from 'lucide-react';
import { KANBAN_COLUMNS } from './constants';

interface JobKanbanBoardProps {
  jobs: Job[];
  currentRole: UserRole;
  theme: ThemeColors;
  onViewDetail: (job: Job) => void;
  onAcceptJob: (jobId: string) => void;
  onCompleteJob: (job: Job) => void;
  onApproveJob: (jobId: string) => void;
  onRejectJob: (job: Job) => void;
  onApproveItem?: (job: Job, item: CarWashItem) => void;
  onRejectItem?: (job: Job, item: CarWashItem) => void;
}

// One card = one vehicle (a job with 3 cars → 3 cards)
interface VehicleCard {
  key: string;
  job: Job;
  item?: CarWashItem;
  vin: string;
  licensePlate?: string;
  model?: string;
  color?: string;
  price: number;
  column: JobStatus;
  index: number;     // 1-based position within the job
  total: number;     // cars in the job
  photos: JobEvidence[];
}

const WASH_TYPE_LABEL: Record<string, string> = {
  STANDARD: 'ล้างปกติ',
  DEEP_CLEAN: 'ล้างเชิงลึก',
  POLISH: 'ขัดเคลือบ',
};

// Decide which kanban column a single car belongs to
function getCarColumn(job: Job, item?: CarWashItem): JobStatus | null {
  if (job.status === 'CANCELLED') return null;
  if (!item) {
    return job.status === 'PENDING_SUPPLIER' ? 'IN_PROGRESS' : job.status;
  }
  if (item.status === 'CANCELLED') return null; // Supplier declined this car
  if (job.status === 'INVOICED') return 'INVOICED';
  if (item.status === 'APPROVED' || job.status === 'APPROVED') return 'APPROVED';
  if (item.status === 'REJECTED' || job.status === 'REJECTED') return 'REJECTED';
  if (item.status === 'COMPLETED' || job.status === 'WAITING_APPROVAL') return 'WAITING_APPROVAL';
  return 'IN_PROGRESS';
}

function toVehicleCards(jobs: Job[]): VehicleCard[] {
  const cards: VehicleCard[] = [];
  jobs.forEach(job => {
    const items = job.carWashItems || [];
    if (items.length === 0) {
      const column = getCarColumn(job);
      if (!column) return;
      cards.push({
        key: job.id,
        job,
        vin: job.vin || '-',
        licensePlate: job.vehicle?.licensePlate,
        model: job.vehicle?.model,
        color: job.vehicle?.color,
        price: getJobTotalCost(job),
        column,
        index: 1,
        total: 1,
        photos: job.evidences || [],
      });
      return;
    }
    items.forEach((item, idx) => {
      const column = getCarColumn(job, item);
      if (!column) return;
      cards.push({
        key: item.id,
        job,
        item,
        vin: item.vin,
        licensePlate: item.licensePlate,
        model: item.vehicleModel,
        color: item.vehicleColor,
        price: item.unitPrice,
        column,
        index: idx + 1,
        total: items.length,
        photos: (job.evidences || []).filter(e => e.vin === item.vin),
      });
    });
  });
  return cards;
}

export const JobKanbanBoard: React.FC<JobKanbanBoardProps> = ({
  jobs,
  currentRole,
  theme,
  onViewDetail,
  onAcceptJob,
  onCompleteJob,
  onApproveJob,
  onRejectJob,
  onApproveItem,
  onRejectItem,
}) => {
  const { activeBranch, currentBranchId } = useApp();
  const vehicleCards = useMemo(() => toVehicleCards(jobs), [jobs]);
  const isReviewer = currentRole !== 'SUPPLIER';

  const renderActions = (card: VehicleCard) => {
    const { job, item } = card;

    if (currentRole === 'SUPPLIER' && job.status === 'PENDING_SUPPLIER') {
      return (
        <button onClick={() => onAcceptJob(job.id)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
          รับงาน
        </button>
      );
    }
    if (currentRole === 'SUPPLIER' && card.column === 'IN_PROGRESS') {
      return (
        <button onClick={() => onCompleteJob(job)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs">
          ส่งงาน
        </button>
      );
    }
    if (!isReviewer || card.column !== 'WAITING_APPROVAL') return null;

    // Per-car review (car was submitted by supplier)
    if (item && item.status === 'COMPLETED' && onApproveItem && onRejectItem) {
      return (
        <>
          <button
            onClick={() => onRejectItem(job, item)}
            title="ตีกลับคันนี้"
            className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onApproveItem(job, item)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
            style={{ backgroundColor: theme.primary }}
          >
            <Check className="w-3.5 h-3.5" /> อนุมัติ
          </button>
        </>
      );
    }

    // Single-vehicle job without items → whole-job review
    if (!item && job.status === 'WAITING_APPROVAL') {
      const myBranchId = activeBranch?.id || currentBranchId;
      const isSlide = job.jobType === 'VEHICLE_SLIDE';
      const isDest = Boolean(isSlide && job.destBranchId && job.destBranchId === myBranchId);
      const isOrigin = Boolean(isSlide && job.destBranchId && (job.originBranchId === myBranchId || job.branchId === myBranchId));

      return (
        <>
          <button
            onClick={() => onRejectJob(job)}
            title="ตีกลับ"
            className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onApproveJob(job.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-xs hover:opacity-90 transition-opacity ${
              isDest ? 'bg-emerald-700' : isOrigin ? 'bg-sky-700' : ''
            }`}
            style={!isDest && !isOrigin ? { backgroundColor: theme.primary } : undefined}
            title={isDest ? 'ยืนยันรับรถเข้าสาขา' : isOrigin ? 'อนุมัติแทนสาขาปลายทาง' : 'อนุมัติงาน'}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isDest ? 'ยืนยันรับรถ' : isOrigin ? 'อนุมัติแทน' : 'อนุมัติ'}</span>
          </button>
        </>
      );
    }
    return null;
  };

  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-[1500px]">
        {KANBAN_COLUMNS.map(col => {
          const colCards = vehicleCards.filter(c => c.column === col.id);
          const colTotal = colCards.reduce((sum, c) => sum + c.price, 0);
          const colJobCount = new Set(colCards.map(c => c.job.id)).size;

          return (
            <div
              key={col.id}
              className={`flex-1 min-w-[280px] max-w-[340px] rounded-3xl border border-gray-200 border-t-4 ${col.borderColor} p-4 flex flex-col gap-3 shadow-xs`}
              style={{ backgroundColor: theme.bgSoft }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h3 className="font-bold text-xs text-gray-800 tracking-tight">
                    {col.title}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg} ${col.badgeText}`}>
                  {colCards.length} คัน
                </span>
              </div>

              {/* Column Summary */}
              <div className="text-[11px] text-gray-500 flex items-center justify-between border-b border-gray-200/80 pb-2">
                <span>{colJobCount} ใบงาน • ยอดรวม</span>
                <span className="font-bold text-gray-800">฿{colTotal.toLocaleString()}</span>
              </div>

              {/* Vehicle Cards */}
              <div className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-320px)] pr-1">
                {colCards.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400 rounded-2xl border border-dashed border-gray-200 bg-white/60">
                    ไม่มีรถในสถานะนี้
                  </div>
                ) : (
                  colCards.map(card => {
                    const { job, item } = card;
                    const isCarWash = job.jobType === 'CAR_WASH';
                    const badge = getScheduleBadge(job);
                    const hero = card.photos[0];
                    const isItemApproved = item?.status === 'APPROVED';
                    const isItemRejected = item?.status === 'REJECTED';
                    const actions = renderActions(card);

                    return (
                      <div
                        key={card.key}
                        onClick={() => onViewDetail(job)}
                        className={`shrink-0 rounded-2xl bg-white border shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer group overflow-hidden ${
                          isItemRejected ? 'border-red-200' : isItemApproved ? 'border-emerald-200' : 'border-gray-200/80'
                        }`}
                      >
                        {/* Top: photo strip or vehicle header */}
                        <div className="flex gap-3 p-3 pb-2">
                          {/* Evidence thumbnail — only once the supplier has uploaded photos */}
                          {hero && (
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shrink-0 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={hero.photoUrl} alt="evidence" className="w-full h-full object-cover" />
                              {card.photos.length > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/60 text-white text-[9px] font-bold">
                                  {card.photos.length}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-gray-900 leading-tight truncate" title={card.licensePlate || card.vin}>{getVehicleLabel(card.vin, card.licensePlate)}</p>
                                <p className="font-mono text-[9px] text-gray-400 truncate" title={card.vin}>{card.vin}</p>
                              </div>
                              <span className="font-mono text-xs font-black shrink-0" style={{ color: theme.textPrimary }}>
                                ฿{card.price.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-gray-700 truncate mt-0.5">
                              {card.model || 'รถยนต์'}
                              {card.color && <span className="font-normal text-gray-400"> · {card.color}</span>}
                            </p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isCarWash ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                              }`}>
                                {isCarWash ? <Sparkles className="w-2.5 h-2.5" /> : <Truck className="w-2.5 h-2.5" />}
                                {isCarWash ? (WASH_TYPE_LABEL[item?.washType || ''] || 'Car Wash') : 'รถสไลด์'}
                              </span>

                              {/* Direction chip for slide jobs */}
                              {!isCarWash && (() => {
                                const myBranchId = activeBranch?.id || currentBranchId;
                                const dir = getSlideDirection(job, myBranchId);
                                if (dir === 'INBOUND') {
                                  return (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      📥 รับเข้า
                                    </span>
                                  );
                                }
                                if (dir === 'OUTBOUND') {
                                  return (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                      📤 ส่งออก
                                    </span>
                                  );
                                }
                                return null;
                              })()}

                              {item?.status === 'COMPLETED' && card.column === 'WAITING_APPROVAL' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700">
                                  <Eye className="w-2.5 h-2.5" /> ส่งงานแล้ว
                                </span>
                              )}
                              {isItemApproved && card.column === 'APPROVED' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                                  <Check className="w-2.5 h-2.5" /> อนุมัติแล้ว
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reject reason */}
                        {isItemRejected && item?.remarks && (
                          <p className="mx-3 mb-2 px-2 py-1 rounded-lg bg-red-50 text-red-700 text-[10px] truncate" title={item.remarks}>
                            ตีกลับ: {item.remarks}
                          </p>
                        )}

                        {/* Job reference */}
                        <div className="mx-3 mb-2 px-2.5 py-2 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0" style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}>
                                {job.companyCode}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-gray-800 truncate">{job.jobNumber}</span>
                            </div>
                            {card.total > 1 && (
                              <span className="text-[9px] font-bold text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded-full shrink-0">
                                คันที่ {card.index}/{card.total}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 min-w-0">
                            <MapPin className="w-2.5 h-2.5 shrink-0 text-gray-400" />
                            <span className="truncate">
                              {isCarWash
                                ? job.branchName
                                : `${job.originBranchName || job.branchName} → ${job.destBranchName || job.customDestAddress || 'ปลายทาง'}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 min-w-0">
                            <Building2 className="w-2.5 h-2.5 shrink-0 text-gray-400" />
                            <span className="truncate">{job.supplierName}</span>
                          </div>
                        </div>

                        {/* Footer: schedule + actions */}
                        <div
                          className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold whitespace-nowrap ${badge.className}`}>
                              {badge.label}
                            </span>
                            <span
                              className="text-[10px] text-gray-400 whitespace-nowrap truncate"
                              title={`วันนัดทำงาน • สั่งงานเมื่อ ${formatThaiDate(job.createdAt)}`}
                            >
                              {formatThaiDate(item?.actualWashDate || getJobScheduleDate(job))}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {actions}
                            {!actions && (
                              <button
                                onClick={() => onViewDetail(job)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
                              >
                                ดู
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
