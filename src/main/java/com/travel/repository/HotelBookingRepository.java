package com.travel.repository;

import com.travel.entity.BookingStatus;
import com.travel.entity.HotelBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface HotelBookingRepository extends JpaRepository<HotelBooking, Long> {
    List<HotelBooking> findByUser_EmailOrderByCreatedAtDesc(String email);

    /** Stays with the given status that share at least one night with [checkIn, checkOut). */
    @Query("select b from HotelBooking b where b.hotel.id = :hotelId and b.status = :status "
            + "and b.checkIn < :checkOut and b.checkOut > :checkIn")
    List<HotelBooking> findOverlapping(@Param("hotelId") Long hotelId, @Param("checkIn") LocalDate checkIn,
                                       @Param("checkOut") LocalDate checkOut, @Param("status") BookingStatus status);
}
