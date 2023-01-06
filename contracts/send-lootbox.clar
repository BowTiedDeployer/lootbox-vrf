
;; send-lootbox

;; constants
;;
(define-constant err-admin-only (err u100))
(define-constant err-invalid-remains (err u303))


;; data vars
;;
(define-data-var contract-admin principal tx-sender)

;; data maps
;; 
(define-map remaining-mints principal uint)


(define-read-only (get-remaining-mints (address principal)) 
  (map-get? remaining-mints address))

(define-public (set-remaining-mints (address principal) (number uint))
  (begin 
    (asserts! (is-eq tx-sender (var-get contract-admin)) err-admin-only) 
    (ok (map-set remaining-mints address number))))


(define-public (claim-lootbox ) 
  (if (is-eq (ok true) (can-mint-lootbox tx-sender))
    (let ((address tx-sender)) 
      (is-ok (set-remaining-mints address (- (unwrap! (map-get? remaining-mints address) err-invalid-remains) u1)))
      (as-contract (contract-call? .lootbox-background create-lootbox address)))
    (ok false)))


(define-read-only (can-mint-lootbox (address principal))
  (let ((remains (map-get? remaining-mints address)) )
  ;; map-get address not is-none
  (if (is-none remains) (ok false) 
    ;; map-get > u1
    (if (< u0 (unwrap! remains err-invalid-remains)) (ok true)
      (ok false)))))
