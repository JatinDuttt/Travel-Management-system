package com.travel.repository;

import com.travel.entity.TravelPackage;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.Optional;

public interface TravelPackageRepository extends JpaRepository<TravelPackage, Long> {
    Page<TravelPackage> findByDestinationContainingIgnoreCaseAndPriceLessThanEqual(
            String destination, BigDecimal maxPrice, Pageable pageable);

    /** Row lock so two users can't grab the last seat at the same time. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from TravelPackage p where p.id = :id")
    Optional<TravelPackage> findForUpdate(@Param("id") Long id);
}
