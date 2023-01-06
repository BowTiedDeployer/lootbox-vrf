;; lootbox-background
;; use the SIP009 interface 
(impl-trait .nft-trait.nft-trait)

;; NFT collection
(define-non-fungible-token lootbox-background uint)

;; constants
;;
(define-constant limit-mint u255)

(define-constant err-admin-only (err u100))
(define-constant err-owner-only (err u101))
(define-constant err-mint-limit-exceeded (err u102))
(define-constant err-missing-block-height (err u402))
(define-constant err-lootbox-locked (err u403))
(define-constant err-invalid-random (err u404))
(define-constant err-invalid-lootbox (err u405))

;; data vars
;;
(define-data-var contract-admin principal tx-sender)
;; only used in demo for 
(define-data-var contract-third-party-claim principal .send-lootbox) 
;; store the last issues token ID
(define-data-var last-id uint u0)
;; store the general ipfs-root of all lootbox nfts
(define-data-var ipfs-root (string-ascii 80) "ipfs://QmWEA3QfSskyopgrw3nPyk8u7UAbPbL7uA3Wj8UbtCuXBt/")

;; data maps 
;;
;; store for the nft-id (uint) the block-height when it was opened (uint)
(define-map block-height-nft uint uint)


;; SIP009 implemented functions 
;; SIP009: Transfer token to a specified principal
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) err-owner-only)
    (nft-transfer? lootbox-background token-id sender recipient)))

(define-public (transfer-memo (token-id uint) (sender principal) (recipient principal) (memo (buff 34)))
  (begin 
    (try! (transfer token-id sender recipient))
    (print memo)
    (ok true)))

;; SIP009: Get the owner of the specified token ID
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? lootbox-background token-id)))

;; SIP009: Get the last token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-id)))

;; SIP009: Get the uri of the specified token ID
(define-read-only (get-token-uri (token-id uint))
    (ok (some (concat (concat (var-get ipfs-root) "$TOKEN_ID") ".json"))))

;; Burn a token
(define-public (burn-token (token-id uint))  
	(begin     
		(asserts! (is-eq (some tx-sender) (nft-get-owner? lootbox-background token-id) ) err-owner-only)     
		(nft-burn? lootbox-background token-id tx-sender)))


;; private functions
;;

;; Internal - Mint new NFT
(define-private (mint (new-owner principal))
  (begin
    (let 
      ((next-id (+ u1 (var-get last-id))))
      (var-set last-id next-id)
      ;; save anchored block-heigh + 1
      (map-set block-height-nft next-id (+ block-height u1))
      (nft-mint? lootbox-background next-id new-owner)
      )))


;; public functions
;;
;; mint lootbox - only admin can
(define-public (create-lootbox (address principal)) 
  (begin
    ;; verify is admin (or demo send-lootbox smart-contract admin)
    (asserts!
      (or 
        (is-eq tx-sender (var-get contract-admin)) 
        (is-eq tx-sender (var-get contract-third-party-claim)))
      err-admin-only) 
    ;; vefiry limit not exceeded
    (asserts! (is-eq true (> limit-mint (var-get last-id))) err-mint-limit-exceeded)
    ;; mint for user
    (mint address)))
    

;; open lootbox - only owner can
(define-public (open-lootbox (lootbox-id uint)) 
  (begin
    ;; verify is owner of lootbox
    (asserts! (is-eq (some tx-sender) (nft-get-owner? lootbox-background lootbox-id)) err-owner-only)
    ;; verify lootbox is not locked
    (asserts! (is-eq (ok true) (is-openable lootbox-id)) err-lootbox-locked)
    ;; get random number
    (let 
      ;; ((rnd (get-random lootbox-id))
      ;; ;; because it is a uniform distribution
      ;; ;; can pick any byte and have same randomness across all of them
      ;; ;; for convenience pick the first byte
      ;; (picked-number (buff-to-uint (unwrap! (element-at (try! rnd) u0) err-invalid-random)))
      ;; keep address of tx-sender locally for (as-contract) call 
      ((address-redeem tx-sender)) 
    ;; burn lootbox
    (some (burn-token lootbox-id))  
    ;; convert it to int => 255 values
    ;; get the item name for that int value
    (as-contract (contract-call? .background-item mint-name address-redeem (unwrap! (item-for-lootbox lootbox-id) err-invalid-lootbox))))))


;; set admin of contract
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) err-admin-only)
    (var-set contract-admin new-admin)
    (ok true)))


;; operation between vrf and id
;; any address should be able to call this
(define-read-only (get-random (lootbox-id uint))
  (begin
    ;; verify can open lootbox
    (asserts! (is-eq (ok true) (is-openable lootbox-id)) err-lootbox-locked)
    ;; get block-height from map (id -> block-height)
    (let ((block-height-lootbox (unwrap! (map-get? block-height-nft lootbox-id) err-missing-block-height)))
    
    ;; convert lootbox-id uint to buff
    ;; concat vrf and id 
    ;; hash it
    ;; return it
    (ok (keccak256 (concat 
      (unwrap! (get-block-info? vrf-seed block-height-lootbox) err-lootbox-locked) 
      (uint-to-buff lootbox-id)))))))


(define-read-only (item-for-value (value uint)) 
  ;; < 51 Goldie | 0x33
  (if (< value u51) "Goldie"
    ;; < 102 DarkPurple | 0x66
    (if (< value u102) "DarkPurple"
      ;; < 153 Emerald | 0x99
      (if (< value u153) "Emerald"
        ;; < 192 Orange | 0xC0
        (if (< value u192) "Orange"
          ;; < 231 Sunset | 0xE7
          (if (< value u231) "Sunset"
          "Purple"))))))

;; get name of the item for a lootbox id
;; complete transparency for all users
(define-read-only (item-for-lootbox (lootbox-id uint))
  (ok (item-for-value (buff-to-uint (unwrap! (element-at (try! (get-random lootbox-id)) u0) err-invalid-random)))))


;; check ready to be opened
;; input uint: id lootbox  
;; output boolean: true / false
(define-read-only (is-openable (lootbox-id uint)) 
  ;;current block is bigger than block-height-nft
  (ok (> block-height (unwrap! (map-get? block-height-nft lootbox-id) err-missing-block-height))))



;; conversions
;;

;; base 16 -> base 10
(define-read-only (buff-to-uint (byte (buff 1))) ;; buff = 1 byte = 2 hex characters
  (unwrap-panic (index-of 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff byte)))

;; base 10 -> base 16
(define-read-only (uint-to-buff (number uint)) ;; uint equivalent to 1 byte = 2 hex characters
  (unwrap-panic (element-at  0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff number)))

(mint 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)
