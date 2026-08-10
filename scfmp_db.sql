-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Generation Time: Aug 10, 2026 at 09:00 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `scfmp_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `cooperatives`
--

CREATE TABLE `cooperatives` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `registration_number` varchar(50) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `sector` varchar(100) DEFAULT NULL,
  `cell` varchar(100) DEFAULT NULL,
  `village` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cooperatives`
--

INSERT INTO `cooperatives` (`id`, `name`, `registration_number`, `district`, `sector`, `cell`, `village`, `phone`, `email`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Nyamagabe Coffee Cooperative', NULL, 'Nyamagabe', NULL, NULL, NULL, NULL, NULL, 'active', '2026-07-13 07:40:31', '2026-07-13 07:40:31'),
(2, 'Gasaka Tea Cooperative', '2', 'Nyamagabe', 'Cyanika', 'Nyanza', '', '0788329052', 'gasakateacooperative@gmail.com', 'active', '2026-07-18 17:58:22', '2026-07-18 17:58:22');

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `cooperative_id` int(11) NOT NULL,
  `owner_type` enum('cooperative','member','farmer','loan') NOT NULL,
  `owner_id` int(11) NOT NULL COMMENT 'The id of the cooperative/member/farmer/loan this document belongs to',
  `original_name` varchar(255) NOT NULL COMMENT 'The filename as uploaded by the user, e.g. "national_id_scan.pdf"',
  `stored_name` varchar(255) NOT NULL COMMENT 'The unique filename actually saved on disk, to avoid collisions',
  `file_path` varchar(500) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL COMMENT 'Size in bytes',
  `description` varchar(255) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `cooperative_id`, `owner_type`, `owner_id`, `original_name`, `stored_name`, `file_path`, `mime_type`, `file_size`, `description`, `uploaded_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'member', 1, 'test-file.txt', '1784011039805-5764c67da041.txt', 'C:\\Users\\USER\\Desktop\\YCA 2026 Application\\SCFMP\\scfmp-backend\\uploads\\1784011039805-5764c67da041.txt', 'text/plain', 24, 'National ID copy', 1, '2026-07-14 06:37:19', '2026-07-14 06:37:19'),
(3, 1, 'member', 2, 'LRHS5792.JPG', '1784132320117-5e85d88d85a1.JPG', 'C:\\Users\\USER\\Desktop\\YCA 2026 Application\\SCFMP\\scfmp-backend\\uploads\\1784132320117-5e85d88d85a1.JPG', 'image/jpeg', 68503, NULL, 2, '2026-07-15 16:18:40', '2026-07-15 16:18:40'),
(4, 2, 'member', 4, 'valentin.jpeg', '1785142556495-b1986389c221.jpeg', 'C:\\Users\\USER\\Desktop\\YCA 2026 Application\\SCFMP\\scfmp-backend\\uploads\\1785142556495-b1986389c221.jpeg', 'image/jpeg', 5504861, NULL, 1, '2026-07-27 08:55:56', '2026-07-27 08:55:56');

-- --------------------------------------------------------

--
-- Table structure for table `farmers`
--

CREATE TABLE `farmers` (
  `id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `farm_size_ha` decimal(10,2) DEFAULT NULL COMMENT 'Farm size in hectares',
  `location` varchar(255) DEFAULT NULL,
  `gps_coordinates` varchar(100) DEFAULT NULL,
  `crop_type` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `farmers`
--

INSERT INTO `farmers` (`id`, `member_id`, `farm_size_ha`, `location`, `gps_coordinates`, `crop_type`, `created_at`, `updated_at`) VALUES
(2, 2, 1.00, 'Nyamagabe,  Cyanika', NULL, 'Maize', '2026-07-14 19:41:29', '2026-07-14 19:41:29'),
(3, 4, 1.00, 'Nyamagabe, Cyanika', NULL, 'RICE', '2026-07-27 08:54:26', '2026-07-27 08:54:26');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

CREATE TABLE `inventory_items` (
  `id` int(11) NOT NULL,
  `cooperative_id` int(11) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `category` enum('seed','fertilizer','equipment','other') DEFAULT 'other',
  `unit` varchar(20) NOT NULL COMMENT 'e.g. kg, litre, piece, bag',
  `quantity_in_stock` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Never edited directly — only changed via inventory_transactions',
  `reorder_level` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Triggers a low-stock alert when quantity_in_stock falls to or below this',
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `status` enum('active','discontinued') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_items`
--

INSERT INTO `inventory_items` (`id`, `cooperative_id`, `item_name`, `category`, `unit`, `quantity_in_stock`, `reorder_level`, `unit_cost`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'NPK Fertilizer', 'fertilizer', 'kg', 25.00, 50.00, 900.00, 'active', '2026-07-13 22:16:06', '2026-07-15 08:16:28'),
(2, 1, 'NPK GOOD', 'equipment', 'kg', 5.00, 100.00, 1000.00, 'active', '2026-07-15 08:16:55', '2026-07-15 08:17:36'),
(3, 1, 'NPK', 'seed', 'kg', 10.00, 30.00, 2000.00, 'active', '2026-07-15 08:19:21', '2026-07-20 09:39:36');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_transactions`
--

CREATE TABLE `inventory_transactions` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `type` enum('in','out') NOT NULL COMMENT '"in" = stock received (purchase, donation); "out" = stock issued/used',
  `quantity` decimal(12,2) NOT NULL,
  `reference` varchar(255) DEFAULT NULL COMMENT 'e.g. "Purchased from AgroSupply Ltd", "Issued to Valentin Nshimiyimana"',
  `transaction_date` date NOT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_transactions`
--

INSERT INTO `inventory_transactions` (`id`, `item_id`, `type`, `quantity`, `reference`, `transaction_date`, `recorded_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'in', 200.00, 'Opening stock', '2026-07-13', 1, '2026-07-13 22:16:06', '2026-07-13 22:16:06'),
(2, 1, 'out', 180.00, 'Issued to Valentin Nshimiyimana', '2026-07-10', 1, '2026-07-13 22:16:46', '2026-07-13 22:16:46'),
(3, 1, 'out', 5.00, 'Testing auto-notification', '2026-07-14', 1, '2026-07-14 06:40:22', '2026-07-14 06:40:22'),
(4, 1, 'in', 10.00, 'agro supply ltd', '2026-07-16', 1, '2026-07-15 08:16:28', '2026-07-15 08:16:28'),
(5, 2, 'in', 10.00, 'Agro supply ', '2026-07-15', 1, '2026-07-15 08:17:22', '2026-07-15 08:17:22'),
(6, 2, 'out', 5.00, 'agro supply ', '2026-07-15', 1, '2026-07-15 08:17:36', '2026-07-15 08:17:36'),
(7, 3, 'in', 10.00, 'Opening stock', '2026-07-15', 1, '2026-07-15 08:19:21', '2026-07-15 08:19:21'),
(8, 3, 'out', 4.00, '', '2026-07-15', 1, '2026-07-15 08:19:36', '2026-07-15 08:19:36'),
(9, 3, 'out', 6.00, '', '2026-07-15', 1, '2026-07-15 08:28:27', '2026-07-15 08:28:27'),
(10, 3, 'in', 10.00, '', '2026-07-20', 1, '2026-07-20 09:39:36', '2026-07-20 09:39:36');

-- --------------------------------------------------------

--
-- Table structure for table `loans`
--

CREATE TABLE `loans` (
  `id` int(11) NOT NULL,
  `cooperative_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `principal_amount` decimal(14,2) NOT NULL,
  `interest_rate` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Annual interest rate as a percentage, e.g. 12.00 for 12%',
  `balance` decimal(14,2) NOT NULL COMMENT 'Remaining amount owed; starts equal to principal_amount, decreases with repayments',
  `issue_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('active','paid','defaulted') DEFAULT 'active',
  `recorded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loans`
--

INSERT INTO `loans` (`id`, `cooperative_id`, `member_id`, `principal_amount`, `interest_rate`, `balance`, `issue_date`, `due_date`, `status`, `recorded_by`, `created_at`, `updated_at`) VALUES
(2, 1, 2, 40000.00, 10.00, 0.00, '2026-07-14', '2026-07-30', 'paid', 1, '2026-07-14 20:04:46', '2026-07-15 16:37:47');

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `id` int(11) NOT NULL,
  `cooperative_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `national_id` varchar(30) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `membership_date` date DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `members`
--

INSERT INTO `members` (`id`, `cooperative_id`, `user_id`, `first_name`, `last_name`, `gender`, `date_of_birth`, `national_id`, `phone`, `address`, `membership_date`, `status`, `created_at`, `updated_at`) VALUES
(2, 1, NULL, 'john', 'doe', 'male', NULL, NULL, '0789329052', '', '2026-07-14', 'active', '2026-07-14 19:40:40', '2026-07-14 19:40:40'),
(3, 2, NULL, 'John', 'smith', 'male', NULL, NULL, '0788329052', '', '2026-07-18', 'active', '2026-07-18 18:01:49', '2026-07-18 18:01:49'),
(4, 2, NULL, 'John', 'DOE', 'male', NULL, NULL, '0788329052', '', '2026-07-27', 'active', '2026-07-27 08:53:59', '2026-07-27 08:53:59');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` varchar(500) NOT NULL,
  `type` enum('info','success','warning','alert') DEFAULT 'info',
  `related_entity_type` varchar(50) DEFAULT NULL,
  `related_entity_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `related_entity_type`, `related_entity_id`, `is_read`, `created_at`, `updated_at`) VALUES
(1, 2, 'Low stock alert', 'NPK Fertilizer is running low: 15 kg remaining (reorder level: 50.00 kg).', 'warning', 'inventory_item', 1, 1, '2026-07-14 06:40:22', '2026-07-15 08:30:54'),
(2, 2, 'Low stock alert', 'NPK GOOD is running low: 5 kg remaining (reorder level: 100.00 kg).', 'warning', 'inventory_item', 2, 1, '2026-07-15 08:17:37', '2026-07-15 08:30:54'),
(3, 2, 'Low stock alert', 'NPK is running low: 6 kg remaining (reorder level: 30.00 kg).', 'warning', 'inventory_item', 3, 1, '2026-07-15 08:19:36', '2026-07-15 08:30:54'),
(4, 2, 'Low stock alert', 'NPK is running low: 0 kg remaining (reorder level: 30.00 kg).', 'warning', 'inventory_item', 3, 1, '2026-07-15 08:28:27', '2026-07-15 08:30:54');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(64) NOT NULL COMMENT 'SHA-256 hash of the raw token — the raw token itself is never stored, only emailed',
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL COMMENT 'Set the moment the token is redeemed, enforcing single-use',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`, `updated_at`) VALUES
(4, 4, '40a04fe699c88ced47ceb6f90b37f526ea73faf6e3e3035513060a15039a1b2d', '2026-07-21 09:02:18', NULL, '2026-07-21 08:32:18', '2026-07-21 08:32:18');

-- --------------------------------------------------------

--
-- Table structure for table `production`
--

CREATE TABLE `production` (
  `id` int(11) NOT NULL,
  `farmer_id` int(11) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'kg',
  `unit_price` decimal(10,2) NOT NULL,
  `total_amount` decimal(14,2) NOT NULL COMMENT 'Auto-calculated: quantity * unit_price',
  `season` varchar(20) DEFAULT NULL COMMENT 'e.g. "2026A" or "2026B" for Rwanda''s two growing seasons',
  `production_date` date NOT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production`
--

INSERT INTO `production` (`id`, `farmer_id`, `product_name`, `quantity`, `unit`, `unit_price`, `total_amount`, `season`, `production_date`, `recorded_by`, `created_at`, `updated_at`) VALUES
(2, 2, 'maize', 12.00, 'kg', 160.00, 1920.00, '2026 B', '2026-07-14', 1, '2026-07-14 19:51:58', '2026-07-14 19:51:58'),
(3, 2, 'Beans', 12.00, 'kg', 1000.00, 12000.00, '2026B', '2026-07-27', 1, '2026-07-27 08:53:21', '2026-07-27 08:53:21'),
(4, 3, 'Rice', 120.00, 'kg', 500.00, 60000.00, '2026B', '2026-07-27', 1, '2026-07-27 08:55:23', '2026-07-27 08:55:23');

-- --------------------------------------------------------

--
-- Table structure for table `sequelizemeta`
--

CREATE TABLE `sequelizemeta` (
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `sequelizemeta`
--

INSERT INTO `sequelizemeta` (`name`) VALUES
('20260101000001-create-cooperatives.js'),
('20260101000002-create-users.js'),
('20260101000003-create-members.js'),
('20260101000004-create-farmers.js'),
('20260101000005-create-production.js'),
('20260101000006-create-loans.js'),
('20260101000007-create-transactions.js'),
('20260101000008-create-inventory-items.js'),
('20260101000009-create-inventory-transactions.js'),
('20260101000010-create-documents.js'),
('20260101000011-create-notifications.js'),
('20260101000012-create-password-reset-tokens.js');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `cooperative_id` int(11) NOT NULL,
  `member_id` int(11) DEFAULT NULL,
  `loan_id` int(11) DEFAULT NULL,
  `type` enum('income','expense','saving','loan_disbursement','loan_repayment') NOT NULL,
  `category` varchar(100) DEFAULT NULL COMMENT 'e.g. "Membership fee", "Equipment purchase", "Coffee sales"',
  `amount` decimal(14,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `cooperative_id`, `member_id`, `loan_id`, `type`, `category`, `amount`, `description`, `transaction_date`, `recorded_by`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, NULL, 'expense', 'Fertilizer purchase', 45000.00, NULL, '2026-06-06', 1, '2026-07-13 22:00:37', '2026-07-13 22:00:37'),
(2, 1, NULL, NULL, 'loan_disbursement', 'Loan disbursement', 100000.00, 'Loan #1 disbursed', '2026-06-10', 1, '2026-07-13 22:01:17', '2026-07-13 22:01:17'),
(3, 1, NULL, NULL, 'income', 'Coffee sales', 160000.00, NULL, '2026-06-05', 1, '2026-07-13 22:03:05', '2026-07-13 22:03:05'),
(4, 1, NULL, NULL, 'loan_repayment', 'Loan repayment', 30000.00, 'Repayment for loan #1', '2026-07-01', 1, '2026-07-13 22:03:40', '2026-07-13 22:03:40'),
(6, 1, 2, 2, 'loan_disbursement', 'Loan disbursement', 40000.00, 'Loan #2 disbursed', '2026-07-14', 1, '2026-07-14 20:04:46', '2026-07-14 20:04:46'),
(9, 1, 2, 2, 'loan_repayment', 'Loan repayment', 40000.00, 'Repayment for loan #2', '2026-07-15', 2, '2026-07-15 16:37:47', '2026-07-15 16:37:47');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `cooperative_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('super_admin','cooperative_manager','accountant','field_officer','farmer') NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `cooperative_id`, `first_name`, `last_name`, `email`, `phone`, `password_hash`, `role`, `status`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, NULL, 'SNDS', 'Admin', 'admin@smartnyamagabe.rw', NULL, '$2a$10$egG2IHEBEJgvJwgQ0WLIX.NwdrjLXu6umTa0z1FloXsi1.JQTUGbq', 'super_admin', 'active', '2026-08-10 15:59:43', '2026-07-13 06:51:15', '2026-08-10 15:59:43'),
(2, 1, 'Jean', 'Uwimana', 'jean@coop.rw', NULL, '$2a$10$d38RmSo/vHLvndbgcZP27ewh7A7fM62mvqhYMW2krozUDyIFB1J9i', 'cooperative_manager', 'active', '2026-07-15 08:30:11', '2026-07-13 07:50:43', '2026-07-15 08:30:11'),
(3, 2, 'John', 'Smith', 'johnsmith@gmail.com', '0788329052', '$2a$10$h28ij/eR4rBjJb9yfHv.zep6h.iCA6yv5cNzqMaMSAN078uSDsHMe', 'cooperative_manager', 'active', '2026-07-27 17:31:46', '2026-07-18 18:03:46', '2026-07-27 17:31:46'),
(4, 2, 'John', 'Smith', 'tuyishimevalentin83@gmail.com', '', '$2a$10$5ZKB41kDOssJewgmu1wejeS1WdPPH/jCczf0HzyYVYsgk.Wa4tP6C', 'accountant', 'active', '2026-08-10 15:59:33', '2026-07-20 21:43:01', '2026-08-10 15:59:33');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cooperatives`
--
ALTER TABLE `cooperatives`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `registration_number` (`registration_number`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaded_by` (`uploaded_by`),
  ADD KEY `documents_cooperative_id` (`cooperative_id`),
  ADD KEY `documents_owner_type_owner_id` (`owner_type`,`owner_id`);

--
-- Indexes for table `farmers`
--
ALTER TABLE `farmers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `member_id` (`member_id`),
  ADD KEY `farmers_member_id` (`member_id`);

--
-- Indexes for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `inventory_items_cooperative_id` (`cooperative_id`);

--
-- Indexes for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `inventory_transactions_item_id` (`item_id`),
  ADD KEY `inventory_transactions_type` (`type`);

--
-- Indexes for table `loans`
--
ALTER TABLE `loans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `loans_cooperative_id` (`cooperative_id`),
  ADD KEY `loans_member_id` (`member_id`),
  ADD KEY `loans_status` (`status`);

--
-- Indexes for table `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `national_id` (`national_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `members_cooperative_id` (`cooperative_id`),
  ADD KEY `members_status` (`status`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_id` (`user_id`),
  ADD KEY `notifications_is_read` (`is_read`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `password_reset_tokens_token_hash` (`token_hash`),
  ADD KEY `password_reset_tokens_user_id` (`user_id`);

--
-- Indexes for table `production`
--
ALTER TABLE `production`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `production_farmer_id` (`farmer_id`),
  ADD KEY `production_production_date` (`production_date`);

--
-- Indexes for table `sequelizemeta`
--
ALTER TABLE `sequelizemeta`
  ADD PRIMARY KEY (`name`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `loan_id` (`loan_id`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `transactions_cooperative_id` (`cooperative_id`),
  ADD KEY `transactions_member_id` (`member_id`),
  ADD KEY `transactions_type` (`type`),
  ADD KEY `transactions_transaction_date` (`transaction_date`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `users_cooperative_id` (`cooperative_id`),
  ADD KEY `users_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cooperatives`
--
ALTER TABLE `cooperatives`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `farmers`
--
ALTER TABLE `farmers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `inventory_items`
--
ALTER TABLE `inventory_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `loans`
--
ALTER TABLE `loans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `members`
--
ALTER TABLE `members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `production`
--
ALTER TABLE `production`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`cooperative_id`) REFERENCES `cooperatives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `farmers`
--
ALTER TABLE `farmers`
  ADD CONSTRAINT `farmers_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD CONSTRAINT `inventory_items_ibfk_1` FOREIGN KEY (`cooperative_id`) REFERENCES `cooperatives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD CONSTRAINT `inventory_transactions_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inventory_transactions_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `loans`
--
ALTER TABLE `loans`
  ADD CONSTRAINT `loans_ibfk_1` FOREIGN KEY (`cooperative_id`) REFERENCES `cooperatives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `loans_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `loans_ibfk_3` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `members`
--
ALTER TABLE `members`
  ADD CONSTRAINT `members_ibfk_1` FOREIGN KEY (`cooperative_id`) REFERENCES `cooperatives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `production`
--
ALTER TABLE `production`
  ADD CONSTRAINT `production_ibfk_1` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `production_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`cooperative_id`) REFERENCES `cooperatives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_4` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`cooperative_id`) REFERENCES `cooperatives` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
