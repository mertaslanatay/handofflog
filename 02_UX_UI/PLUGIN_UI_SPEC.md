# Plugin UI Specification

## Görsel yaklaşım

- Teknik fakat sade
- Figma arayüzüne uyumlu yoğunluk
- Değişiklik merkezli hiyerarşi
- Added/changed/removed semantiği
- Eski değer → yeni değer gösterimi
- Riskli aksiyonlarda açıklayıcı confirmation

## Overview

Göster:
- Proje/scope adı
- Aktif baseline
- Son snapshot tarihi
- Takip edilen node sayısı
- Son tarama sonucu

Ana aksiyonlar:
- Scan Changes
- Create Baseline
- Manage Scope
- View Releases

## Change card

Sıralama:
1. Değişiklik tipi
2. Node adı
3. Property
4. Eski değer → yeni değer
5. Etki
6. Include toggle

## Empty states

### Baseline yok
“Bu seçim için henüz başlangıç sürümü oluşturulmadı.”

CTA: `Create Baseline`

### Değişiklik yok
“Baseline’dan bu yana takip edilen bir değişiklik bulunamadı.”

CTA: `Scan Again`

### Selection yok
“Takip etmek istediğin frame veya section’ı Figma canvas’ından seç.”

CTA: `Use Current Selection`

## Erişilebilirlik

- Klavye navigasyonu
- Visible focus
- Sadece renge bağlı durum aktarımı yok
- Minimum 4.5:1 metin kontrastı
- Dinamik tarama sonuçları için uygun live-region kullanımı
