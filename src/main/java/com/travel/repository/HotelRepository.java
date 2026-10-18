package com.travel.repository;

import com.travel.entity.Hotel;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
    Page<Hotel> findByCityContainingIgnoreCase(String city, Pageable pageable);

    /** Row lock so two guests can't take the last room for the same night at the same time. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select h from Hotel h where h.id = :id")
    Optional<Hotel> findForUpdate(@Param("id") Long id);
}
